import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts } from 'pdf-lib';
import { SeniorApiService } from '../../general/senior-api.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PAGE_HEIGHT,
  PAGE_WIDTH,
  drawAssinaturasEletronicas,
  drawFooter,
  drawHeader,
  drawParagraphs,
  embedLogo,
} from '../pdf-render.utils';

const CLAUSULAS_ASSINATURA_CONTRATO = [
  '11. As partes convencionam, para todos os fins do art. 10, § 2º, da Medida Provisória nº 2.200-2/2001, que o presente instrumento é celebrado e assinado por meio eletrônico, reconhecendo-o desde já como válido, autêntico, íntegro e eficaz, com força de instrumento particular, ainda que a assinatura do EMPREGADO seja produzida por processo de certificação não vinculado à ICP-Brasil.',
  '12. A assinatura do EMPREGADO será colhida mediante assinatura eletrônica avançada, na acepção do art. 4º, II, da Lei nº 14.063/2020, adotada como parâmetro técnico de referência, por um ou mais dos seguintes métodos disponibilizados pela plataforma Admissão Digital: (i) código de uso único (OTP) enviado ao endereço de e-mail e/ou ao número de telefone celular previamente cadastrados pelo EMPREGADO; (ii) verificação biométrica; e/ou (iii) reconhecimento facial com prova de vivacidade.',
  '13. A EMPREGADORA firmará o instrumento por seu representante legal ou procurador com poderes bastantes, mediante certificado digital padrão ICP-Brasil, na forma do art. 10, § 1º, da MP nº 2.200-2/2001.',
  '14. O EMPREGADO declara que teve acesso prévio e integral ao teor deste instrumento antes de assiná-lo, que dispôs de tempo suficiente para sua leitura, que lhe foi facultado esclarecer dúvidas junto à EMPREGADORA e que o endereço de e-mail e o número de telefone utilizados para o recebimento do código de uso único são de sua exclusiva titularidade e uso pessoal.',
  '15. Integram este instrumento, para todos os efeitos probatórios, o comprovante de assinatura eletrônica e a respectiva trilha de auditoria, dos quais constarão a identificação do signatário, o método de autenticação empregado, data e hora, endereço IP, dispositivo utilizado, código de verificação e os resumos criptográficos (hash) do documento antes e após a assinatura.',
  '16. A EMPREGADORA disponibilizará ao EMPREGADO, sem qualquer custo, acesso permanente ao documento assinado e ao respectivo comprovante, com possibilidade de download, e encaminhará cópia ao e-mail por ele indicado, obrigando-se a arquivar o instrumento e sua trilha de auditoria por prazo não inferior a 5 (cinco) anos contados da extinção do contrato de trabalho.',
];

export type CandidaturaContrato = Prisma.CandidaturaGetPayload<{
  include: { candidato: true; requisicao: { include: { empresa: true } } };
}>;

interface FilialAdmissao {
  NUMCGC: string | number;
  RAZSOC: string;
  TIPLGR: string;
  ENDFIL: string;
  ENDNUM: string;
  CODBAI: number;
  NOMBAI: string;
  CODCEP: number;
  CODCID: number;
  NOMCID: string;
  CODEST: string;
}

interface SalarioAdmissao {
  CODEST: number;
  CLAINI: string;
  NIVINI: string;
  VALSAL: number;
}

@Injectable()
export class ContratoExperienciaService {
  static readonly CODIGO = 'contrato-experiencia';
  static readonly NOME = 'Contrato de Experiência';

  private readonly logger = new Logger(ContratoExperienciaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seniorApi: SeniorApiService,
  ) {}

  async gerarPdfById(candidaturaId: number): Promise<Buffer> {
    const candidatura = await this.prisma.candidatura.findUnique({
      where: { id: candidaturaId },
      include: { candidato: true, requisicao: { include: { empresa: true } } },
    });
    if (!candidatura) throw new NotFoundException('Candidatura não encontrada.');
    return this.gerarPdf(candidatura);
  }

  async gerarPdf(candidatura: CandidaturaContrato): Promise<Buffer> {
    const prazoContratoDias = candidatura.requisicao.prazoContratoDias ?? 30;

    if (prazoContratoDias <= 0) {
      throw new BadRequestException('O prazo do contrato de experiência deve ser maior que zero.');
    }
    if (prazoContratoDias > 90) {
      throw new BadRequestException(
        'O prazo do contrato de experiência não pode exceder 90 dias (CLT Art. 445).',
      );
    }

    const numemp = parseInt(candidatura.requisicao.empresa?.codigoEmpresaSenior ?? '1', 10);
    const codfil = candidatura.requisicao.filial ?? 0;
    const dataAdmissao =
      candidatura.admissao ?? candidatura.requisicao.dataPrevistaAdmissao ?? new Date();

    const [filial, salario] = await Promise.all([
      this.buscarFilial(numemp, codfil),
      this.buscarSalario(
        numemp,
        codfil,
        candidatura.requisicao.estcar,
        candidatura.requisicao.cargo,
        dataAdmissao,
      ),
    ]);

    const empresaNome =
      filial?.RAZSOC ?? candidatura.requisicao.empresa?.nome ?? 'Supermercado Coelho Diniz Ltda';
    const empresaCnpj = filial ? this.formatarCnpj(filial.NUMCGC) : '41.930.199/0026-92';
    const empresaCidade = filial?.NOMCID ?? 'Governador Valadares';
    const empresaEndereco = filial
      ? `${filial.TIPLGR} ${filial.ENDFIL}, ${filial.ENDNUM} - ${filial.NOMBAI}`
      : 'MARECHAL FLORIANO, 1527 - CENTRO';
    const salarioFormatado = salario
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
          salario.VALSAL,
        )
      : '__________';

    const candidatoNome = (candidatura.candidato.nome ?? 'NOME NÃO INFORMADO').toUpperCase();
    const candidatoCpf = this.formatarCpf(candidatura.candidato.cpf);
    const cargo = (
      candidatura.requisicao.cargoNome ??
      candidatura.requisicao.cargo ??
      'CARGO NÃO INFORMADO'
    ).toUpperCase();
    const codigoCargo = candidatura.requisicao.cargo ?? '';
    const menorDe18 = this.calcularIdade(candidatura.candidato.dataNascimento, dataAdmissao) < 18;
    const candidatoEndereco = this.montarEnderecoResidencial(candidatura.candidato);
    const candidatoBairro = candidatura.candidato.bairroNome ?? '__________';
    const candidatoCep = candidatura.candidato.cep ? this.formatarCep(candidatura.candidato.cep) : '__________';
    const candidatoPis = candidatura.candidato.pis ?? '__________';

    const pdf = await PDFDocument.create();
    pdf.setTitle(ContratoExperienciaService.NOME);
    pdf.setAuthor('Admissão Digital');
    pdf.setCreator('Admissão Digital');
    pdf.setProducer('Admissão Digital');

    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const logo = await embedLogo(pdf);

    const page1 = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.desenharContrato(pdf, page1, regular, bold, logo, {
      empresaNome,
      empresaCnpj,
      empresaCidade,
      empresaEndereco,
      candidatoNome,
      candidatoCpf,
      cargo,
      codigoCargo,
      salarioFormatado,
      dataAdmissao,
      prazoContratoDias,
      menorDe18,
      candidatoEndereco,
      candidatoBairro,
      candidatoCep,
      candidatoPis,
    });

    return Buffer.from(await pdf.save());
  }

  private async buscarFilial(numemp: number, codfil: number): Promise<FilialAdmissao | null> {
    if (!codfil) return null;
    try {
      return await this.seniorApi.get<FilialAdmissao | null>(
        `/admissao/filial?numemp=${numemp}&codfil=${codfil}`,
      );
    } catch (err) {
      this.logger.warn(`Falha ao buscar filial ${codfil}: ${String(err)}`);
      return null;
    }
  }

  private async buscarSalario(
    numemp: number,
    codfil: number,
    estcar: number,
    codcar: string | null | undefined,
    datadm: Date,
  ): Promise<SalarioAdmissao | null> {
    if (!codcar || !codfil) return null;
    const datadmStr = this.formatarDataAdmissao(datadm);
    const url = `/admissao/salario?numemp=${numemp}&estcar=${estcar}&codcar=${encodeURIComponent(codcar)}&codfil=${codfil}&datadm=${encodeURIComponent(datadmStr)}`;
    try {
      return await this.seniorApi.get<SalarioAdmissao | null>(url);
    } catch (err) {
      this.logger.warn(`Falha ao buscar salário: ${String(err)}`);
      return null;
    }
  }

  private formatarCnpj(cnpj: string | number): string {
    const d = String(cnpj).replace(/\D/g, '').padStart(14, '0');
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  private formatarCpf(cpf: string): string {
    const d = cpf.replace(/\D/g, '');
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  private formatarDataAdmissao(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }

  private formatarCep(cep: string): string {
    const d = cep.replace(/\D/g, '').padStart(8, '0');
    return d.replace(/^(\d{5})(\d{3})$/, '$1-$2');
  }

  private calcularIdade(dataNascimento: Date, dataReferencia: Date): number {
    let idade = dataReferencia.getUTCFullYear() - dataNascimento.getUTCFullYear();
    const mes = dataReferencia.getUTCMonth() - dataNascimento.getUTCMonth();
    if (mes < 0 || (mes === 0 && dataReferencia.getUTCDate() < dataNascimento.getUTCDate())) {
      idade -= 1;
    }
    return idade;
  }

  private montarEnderecoResidencial(candidato: CandidaturaContrato['candidato']): string {
    const partes: string[] = [];
    if (candidato.tipoLogradouro) partes.push(candidato.tipoLogradouro);
    if (candidato.endereco) partes.push(candidato.endereco);
    if (candidato.numero) partes.push(candidato.numero);
    return partes.length ? partes.join(' ') : '__________';
  }

  private desenharContrato(
    pdf: PDFDocument,
    page: PDFPage,
    regular: PDFFont,
    bold: PDFFont,
    logo: PDFImage,
    data: {
      empresaNome: string;
      empresaCnpj: string;
      empresaCidade: string;
      empresaEndereco: string;
      candidatoNome: string;
      candidatoCpf: string;
      cargo: string;
      codigoCargo: string;
      salarioFormatado: string;
      dataAdmissao: Date;
      prazoContratoDias: number;
      menorDe18: boolean;
      candidatoEndereco: string;
      candidatoBairro: string;
      candidatoCep: string;
      candidatoPis: string;
    },
  ): void {
    let y = drawHeader(page, logo, 'Contrato de Trabalho a Título de Experiência', bold);

    const conteudo = this.montarClausulasContrato(data).join('\n');

    const { page: lastPage, y: lastY } = drawParagraphs(pdf, page, conteudo, regular, y, 8.5, {
      lineHeight: 11,
      paragraphSpacing: 4,
      blankLineHeight: 0,
      x: 42,
      maxWidth: 511,
    });

    const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(data.dataAdmissao);
    lastPage.drawText(`${data.empresaCidade}, ${dataFormatada}.`, {
      x: 42, y: lastY - 10, size: 8.5, font: regular,
    });

    drawAssinaturasEletronicas(
      pdf,
      lastPage,
      regular,
      bold,
      lastY - 30,
      data.empresaNome,
      data.candidatoNome,
    );
    drawFooter(page);
  }

  private montarClausulasContrato(
    data: {
      empresaNome: string;
      empresaCnpj: string;
      empresaCidade: string;
      empresaEndereco: string;
      candidatoNome: string;
      candidatoCpf: string;
      cargo: string;
      codigoCargo: string;
      salarioFormatado: string;
      dataAdmissao: Date;
      prazoContratoDias: number;
      menorDe18: boolean;
      candidatoEndereco: string;
      candidatoBairro: string;
      candidatoCep: string;
      candidatoPis: string;
    },
  ): string[] {
    if (data.menorDe18) return this.montarClausulasMenorIdade(data);
    if (data.codigoCargo === '00024') return this.montarClausulasCargoExterno(data);
    return this.montarClausulasPadrao(data);
  }

  private montarClausulasPadrao(
    data: {
      empresaNome: string;
      empresaCnpj: string;
      empresaCidade: string;
      empresaEndereco: string;
      candidatoNome: string;
      candidatoCpf: string;
      cargo: string;
      salarioFormatado: string;
      dataAdmissao: Date;
      prazoContratoDias: number;
    },
  ): string[] {
    return [
      `Entre a firma ${data.empresaNome}, CNPJ ${data.empresaCnpj} com sede em ${data.empresaCidade} na ${data.empresaEndereco}, doravante designada simplesmente EMPREGADORA e ${data.candidatoNome} portador(a) do CPF nº ${data.candidatoCpf}, a seguir chamado apenas EMPREGADO, e celebrado o presente CONTRATO DE EXPERIÊNCIA, que terá vigência a partir da data de início de serviços, de acordo com as condições a seguir especificadas:`,
      `1 - Fica o EMPREGADO admitido no quadro de funcionários da EMPREGADORA para exercer as funções de ${data.cargo} mediante a remuneração de ${data.salarioFormatado} por mês. A circunstância, porém, de ser a função especificada não importa na intransferibilidade do EMPREGADO para outro serviço, o qual demonstre melhor capacidade de adaptação desde que compatível com a sua condição pessoal.`,
      `2 - O horário de trabalho será anotado na sua ficha de registro e a eventual redução de jornada, por determinação da EMPREGADORA, não inovará este ajuste, permanecendo sempre íntegra a obrigação do EMPREGADO de cumprir o horário que lhe for determinado, observando o limite legal.`,
      `3 - Obriga-se também o EMPREGADO a prestar serviços em horas extraordinárias, sempre que lhe for determinado pela EMPREGADORA na forma prevista em Lei. Na hipótese desta faculdade pela EMPREGADORA, o EMPREGADO receberá as horas extraordinárias em acréscimo legal, salvo a ocorrência de compensação, com a consequente redução da jornada de trabalho em outro dia.`,
      `4 - Aceita o EMPREGADO, expressamente, a condição de prestar serviços em qualquer dos turnos de trabalho, isto é, tanto durante o dia como a noite, desde que sem simultaneidade, observadas as prescrições legais, reguladoras do assunto, quanto à remuneração.`,
      `5 - Fica ajustado nos termos do que dispõe o Par. 1º do artigo 469 da Consolidação das Leis do Trabalho, que o EMPREGADO acatará ordem emanada da EMPREGADORA para prestação de serviços tanto na localidade de celebração do Contrato de Trabalho, como em qualquer outra Cidade, Capital ou Vila do Território Nacional, quer essa transferência seja transitória, quer seja definitiva.`,
      `6 - No ato da assinatura deste contrato, o EMPREGADO recebe o Regulamento Interno da Empresa cujas cláusulas fazem parte do Contrato de Trabalho, e a violação de qualquer delas implicará em sanção, cuja graduação dependerá da gravidade da mesma, culminando com a rescisão do Contrato.`,
      `7 - Em caso de dano causado pelo EMPREGADO, fica a EMPREGADORA autorizada a efetivar o desconto da importância correspondente ao prejuízo, com fundamento no Parágrafo 1º do Artigo 462 da Consolidação das Leis do Trabalho, já que essa possibilidade fica expressamente prevista em Contrato.`,
      `8 - O presente Contrato vigerá durante ${data.prazoContratoDias} dias, sendo celebrado para as partes verificarem reciprocamente a conveniência ou não de se vincularem em caráter definitivo a um Contrato de Trabalho. A Empresa passando a conhecer as aptidões do EMPREGADO e suas qualidades pessoais e morais; o EMPREGADO verificando se o ambiente e os métodos de trabalho atendem a sua conveniência.`,
      `9 - Opera-se a rescisão do presente Contrato pela decorrência do prazo supra ou por vontade de uma das partes; rescindindo-se por vontade do EMPREGADO ou pela EMPREGADORA com justa causa, nenhuma indenização é devida; rescindindo-se, antes do prazo, por qualquer uma das partes, fica esta obrigada a pagar 50% dos salários até o final.`,
      `10 - Na hipótese deste ajuste transformar-se em Contrato de Prazo Indeterminado pelo decurso do tempo, continuarão em plena vigência as cláusulas de 1 (um) a 7 (sete), enquanto durarem as relações do EMPREGADO com a EMPREGADORA.`,
      ...CLAUSULAS_ASSINATURA_CONTRATO,
    ];
  }

  private montarClausulasMenorIdade(
    data: Parameters<ContratoExperienciaService['montarClausulasContrato']>[0],
  ): string[] {
    const clausulas = this.montarClausulasPadrao(data);
    clausulas[1] = `1 - Fica o EMPREGADO admitido no quadro de funcionários da EMPREGADORA para exercer as funções de ${data.cargo} mediante a remuneração de ${data.salarioFormatado} por mês. A circunstância, porém, de ser a função especificada não importa na intransferibilidade do EMPREGADO para outro serviço, o qual demonstre melhor capacidade de adaptação desde que compatível com a sua condição pessoal, e respeitado o disposto no inciso XXXIII do artigo 7º, da Constituição Federal e nos artigos 403 a 405, da Consolidação da Leis do Trabalho, que vedam a realização de trabalho perigoso, insalubre ou prejudicial ao desenvolvimento físico, psicológico e moral do menor de 18 anos.`;
    clausulas[3] = `3 - Obriga-se também o EMPREGADO a prestar serviços em horas extraordinárias, sempre que lhe for determinado pela EMPREGADORA, observando-se as limitações impostas pela legislação vigente para menores de 18 anos, em especial o artigo 413 da Consolidação das Leis do Trabalho. Na hipótese desta faculdade pela EMPREGADORA, o EMPREGADO receberá as horas extraordinárias em acréscimo legal, salvo a ocorrência de compensação, com a consequente redução da jornada de trabalho em outro dia.`;
    clausulas[4] = `4 - Aceita o EMPREGADO, expressamente, a condição de prestar serviços em qualquer dos turnos de trabalho, isto é, tanto durante o dia como a noite, desde que sem simultaneidade, observadas as prescrições legais, reguladoras do assunto e o disposto no artigo 7º, inciso XXXIII, da Constituição Federal e no artigo 404 da Consolidação das Leis do Trabalho, que vedam a realização de trabalho noturno (entre 22h e 5h) ao menor de 18 anos.`;
    clausulas[5] = `5 - Fica ajustado nos termos do que dispõe o Par. 1º do artigo 469, da Consolidação das Leis do Trabalho, que o EMPREGADO acatará ordem emanada da EMPREGADORA para prestação de serviços tanto na localidade de celebração do Contrato de Trabalho, como em qualquer outra Cidade, Capital ou Vila do Território Nacional, quer essa transferência seja transitória, quer seja definitiva, desde que expressamente autorizada pelos pais ou responsáveis legais do menor.`;
    clausulas.splice(8, 0, `8 - O EMPREGADO e seu responsável legal autorizam, de forma irrevogável e gratuita, por prazo indeterminado, a EMPREGADORA a utilizar a imagem do EMPREGADO em fotografias, vídeos e outros materiais audiovisuais produzidos no âmbito das atividades relacionadas à empresa, exclusivamente para fins institucionais, promocionais ou publicitários, tais como divulgação em redes sociais, site oficial, material interno e campanhas de marketing.`);
    clausulas[9] = `9 - O presente Contrato vigerá durante ${data.prazoContratoDias} dias, sendo celebrado para as partes verificarem reciprocamente a conveniência ou não de se vincularem em caráter definitivo a um Contrato de Trabalho. A Empresa passando a conhecer as aptidões do EMPREGADO e suas qualidades pessoais e morais; o EMPREGADO verificando se o ambiente e os métodos de trabalho atendem a sua conveniência.`;
    clausulas[10] = `10 - Opera-se a rescisão do presente Contrato pela decorrência do prazo supra ou por vontade de uma das partes; rescindindo-se por vontade do EMPREGADO ou pela EMPREGADORA com justa causa, nenhuma indenização é devida; rescindindo-se, antes do prazo, por qualquer uma das partes, fica esta obrigada a pagar 50% dos salários até o final.`;
    clausulas[11] = `11 - Na hipótese deste ajuste transformar-se em Contrato de Prazo Indeterminado pelo decurso do tempo, continuarão em plena vigência as cláusulas de 1 (um) a 7 (sete), enquanto durarem as relações do EMPREGADO com a EMPREGADORA.`;
    return clausulas;
  }

  private montarClausulasCargoExterno(
    data: Parameters<ContratoExperienciaService['montarClausulasContrato']>[0],
  ): string[] {
    return [
      `Por este instrumento de contrato de trabalho que entre si fazem a empresa ${data.empresaNome}, inscrita no CNPJ/MF sob o nº ${data.empresaCnpj}, com sede em ${data.empresaCidade}, na ${data.empresaEndereco}, neste ato denominada EMPREGADORA e o Sr. ${data.candidatoNome}, residente e domiciliado nesta cidade na ${data.candidatoEndereco}, bairro ${data.candidatoBairro}, CEP: ${data.candidatoCep}, inscrito no CPF sob o nº ${data.candidatoCpf}, PIS/PASEP sob nº ${data.candidatoPis}, doravante EMPREGADO, firmam o presente, contando com as seguintes cláusulas e condições:`,
      `CLÁUSULA PRIMEIRA: O EMPREGADO, doravante, na função de ${data.cargo}, exercerá suas funções em regime de trabalho externo, iniciando e finalizando sua jornada, em ambiente fora da empresa, sem qualquer controle do empregador, visando o exercício das suas funções junto aos fornecedores e correlatos;`,
      `CLÁUSULA SEGUNDA: As partes pactuam que, nos termos do artigo 62, Inciso I da CLT, em razão da incompatibilidade o EMPREGADO não terá sua jornada de trabalho controlada;`,
      `CLÁUSULA TERCEIRA: A remuneração mensal do EMPREGADO será de ${data.salarioFormatado};`,
      `CLÁUSULA QUARTA: O EMPREGADO se obriga a respeitar e fazer respeitar os regulamentos internos de trabalho, defendendo os interesses da EMPREGADORA, agindo com correção, dedicação, lealdade e solicitude, não só com os diretores da EMPREGADORA que são seus superiores hierárquicos, como também com colegas de trabalho, terceiros e todos que, em decorrência deste, com ele mantiverem contato.`,
      `CLÁUSULA QUINTA: O EMPREGADO, durante a vigência do contrato de trabalho, receberá, desenvolverá ou, de qualquer forma, obterá várias informações de natureza confidencial. Sendo certo que estas informações confidenciais não poderão ser assinadas, reveladas ou usadas direta ou indiretamente, sejam referentes a implantação de técnicas de gestão voltadas para a atividade exercida, processos, procedimentos, assuntos de negócios, planos futuros, idéias, certificados, documentos, manuais de organização, de rotinas, procedimentos e instruções ou quaisquer outros aqui não especificados, sem EXPRESSA AUTORIZAÇÃO E POR ESCRITO DA EMPREGADORA. Devendo o EMPREGADO manter o sigilo e confidencialidade destas informações, sendo certo que a não observância desta prática constituíra violação de segredo profissional e industrial, nos termos do artigo 482, “g” da Consolidação das Leis do Trabalho, sem prejuízo das responsabilidades civis e penais cabíveis.`,
      `Parágrafo Primeiro: O EMPREGADO agirá diligentemente no sentido de proteger e guardar toda e qualquer “informação confidencial” da EMPREGADORA, bem como das empresas que, direta ou indiretamente, sejam coligadas a esta, considerando-se como “informação confidencial” toda e qualquer informação técnica, administrativa e organizacional que não sejam de domínio público.`,
      `Parágrafo Segundo: Durante o período em que perdurar a relação de emprego, e pelo período de 05 (cinco) anos depois de terminada, o EMPREGADO compromete-se, quer direta ou indiretamente, a não utilizar para si, ou para outrem, não revelar a terceiros, qualquer “informação confidencial” (tenha esta sido ou não adquirida, obtida ou desenvolvida pelo Empregado, ou por este em conjunto com outros) da EMPREGADORA, bem como das empresas direta ou indiretamente coligadas, exceto se tal uso ou revelação seja necessário e decorrente ao desenvolvimento normal de suas atividades da relação de emprego, prevista neste instrumento, ou seja permitida pela EMPREGADORA.`,
      `Parágrafo Terceiro: Todos e quaisquer materiais e/ou documentos relacionados à “informação confidencial”, estejam estes sob meios físicos ou eletrônicos, só poderão ser removidos do estabelecimento da EMPREGADORA, seja através de original, cópias ou transferências de dados ou arquivos eletrônicos, mediante prévia autorização desta última, exceto se necessário e decorrente ao desenvolvimento normal de suas atividades da relação de emprego, prevista neste instrumento.`,
      `CLÁUSULA SEXTA: Terminada sua relação de emprego, o EMPREGADO deverá, de imediato, devolver todos e quaisquer materiais e/ou documentos eventualmente em seu poder, não podendo ser reproduzida ou retida qualquer cópia, seja de forma total ou parcial.`,
      `CLÁUSULA SÉTIMA: No caso de mudança de residência, alterações de estado civil, nascimento de filhos ou modificações de nome, fica o EMPREGADO na obrigação de comunicar o fato à EMPREGADORA até o terceiro dia após a ocorrência do fato.`,
      `CLÁUSULA OITAVA: O EMPREGADO se obriga a colocar todo o seu empenho nas atividades consubstanciadas no contrato de trabalho já assinado, bem como nas demais que sejam determinadas, executando-as com absoluta diligência, rapidez e dedicação, por toda a duração da relação de emprego.`,
      `CLÁUSULA NONA: O EMPREGADO se obriga a não executar nem dirigir qualquer atividade estranha à EMPREGADORA, nem dela participar de qualquer forma, por si ou por terceiros, por toda duração da relação empregatícia, salvo expresso consentimento por escrito da EMPREGADORA.`,
      ...CLAUSULAS_ASSINATURA_CONTRATO,
    ];
  }
}
