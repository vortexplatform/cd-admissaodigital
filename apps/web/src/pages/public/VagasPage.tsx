import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  HeartHandshake,
  MapPin,
  Mail,
  Phone,
  Store,
  Clock,
} from 'lucide-react';

const vagasDestaque = [
  { cargo: 'Operador(a) de Caixa', setor: 'Frente de loja', tipo: 'Efetivo' },
  { cargo: 'Repositor(a)', setor: 'Mercadorias', tipo: 'Efetivo' },
  { cargo: 'Açougueiro(a)', setor: 'Açougue', tipo: 'Efetivo' },
  { cargo: 'Padeiro(a)', setor: 'Padaria', tipo: 'Efetivo' },
  { cargo: 'Fiscal de Loja', setor: 'Operações', tipo: 'Efetivo' },
  { cargo: 'Jovem Aprendiz', setor: 'Todos os setores', tipo: 'Aprendizagem' },
];

const BRAND_YELLOW = '#f5c400';

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-md font-display text-lg font-bold text-neutral-950"
            style={{ backgroundColor: BRAND_YELLOW }}
          >
            CD
          </span>
          <span className="font-display text-base font-semibold tracking-tight text-white">
            Coelho Diniz <span style={{ color: BRAND_YELLOW }}>RH</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/rh/login"
            className="rounded-md border border-white/25 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-white/60"
          >
            Sou RH
          </Link>
          <Link
            to="/rh/login-candidato"
            className="rounded-md px-4 py-2 text-sm font-semibold text-neutral-950 transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND_YELLOW }}
          >
            Sou Candidato
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white">
      <div
        className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: BRAND_YELLOW }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full opacity-10 blur-3xl"
        style={{ backgroundColor: BRAND_YELLOW }}
      />
      <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: BRAND_YELLOW }}>
          Recrutamento &amp; Seleção
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
          Sua carreira começa onde o atendimento é levado a{' '}
          <span style={{ color: BRAND_YELLOW }}>sério</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-neutral-300">
          O Supermercado Coelho Diniz busca profissionais comprometidos com a satisfação dos
          clientes e o crescimento da empresa. Cadastre seu currículo e faça parte do nosso time.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/rh/login-candidato"
            className="inline-flex items-center gap-2 rounded-md px-6 py-3 text-base font-semibold text-neutral-950 transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND_YELLOW }}
          >
            Quero me candidatar
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#vagas"
            className="inline-flex items-center gap-2 rounded-md border border-white/25 px-6 py-3 text-base font-medium text-white transition-colors hover:border-white/60"
          >
            Ver vagas
          </a>
        </div>
        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-6 border-t border-white/10 pt-8">
          {[
            ['+40', 'anos de história'],
            ['Diversas', 'unidades na região'],
            ['Centenas', 'de colaboradores'],
          ].map(([valor, rotulo]) => (
            <div key={rotulo}>
              <dt className="sr-only">{rotulo}</dt>
              <dd className="font-display text-2xl font-semibold sm:text-3xl" style={{ color: BRAND_YELLOW }}>
                {valor}
              </dd>
              <dd className="mt-1 text-sm text-neutral-400">{rotulo}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Vagas() {
  return (
    <section id="vagas" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
          Oportunidades
        </p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
          Vagas disponíveis
        </h2>
        <p className="mt-4 max-w-2xl text-neutral-600">
          Estamos sempre em busca de talentos para as nossas lojas. Confira algumas das posições
          que costumamos recrutar e cadastre seu currículo — nossa equipe de RH entrará em contato
          quando surgir uma oportunidade para o seu perfil.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vagasDestaque.map((vaga) => (
            <div
              key={vaga.cargo}
              className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-6 transition-colors hover:border-neutral-950"
            >
              <div className="flex items-center justify-between">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${BRAND_YELLOW}26` }}
                >
                  <Briefcase className="h-5 w-5 text-neutral-950" />
                </span>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600">
                  {vaga.tipo}
                </span>
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-neutral-950">
                {vaga.cargo}
              </h3>
              <p className="mt-1 text-sm text-neutral-500">{vaga.setor}</p>
              <Link
                to="/rh/login-candidato"
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-950 group-hover:underline"
              >
                Candidatar-se
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Inclusao() {
  return (
    <section className="bg-neutral-950 py-20 text-white sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <span
            className="flex h-12 w-12 items-center justify-center rounded-md"
            style={{ backgroundColor: BRAND_YELLOW }}
          >
            <HeartHandshake className="h-6 w-6 text-neutral-950" />
          </span>
          <h2 className="mt-6 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Incluir para transformar
          </h2>
          <p className="mt-4 text-neutral-300">
            A Lei nº 8.213/91 prevê que empresas destinem cotas de vagas para pessoas com
            deficiência (PCD). Cientes da nossa responsabilidade e preocupados com a integração e
            a inclusão, o Supermercado Coelho Diniz oferece condições de trabalho e oportunidades
            para PCDs.
          </p>
          <p className="mt-4 text-neutral-300">
            Se você — ou alguém que conheça — se encaixa nesse perfil, indique-nos: gostaríamos
            muito de conhecê-lo.
          </p>
          <Link
            to="/rh/login-candidato"
            className="mt-8 inline-flex items-center gap-2 rounded-md px-6 py-3 text-base font-semibold text-neutral-950 transition-opacity hover:opacity-90"
            style={{ backgroundColor: BRAND_YELLOW }}
          >
            Quero participar
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-md"
            style={{ backgroundColor: `${BRAND_YELLOW}26` }}
          >
            <GraduationCap className="h-6 w-6" style={{ color: BRAND_YELLOW }} />
          </span>
          <h3 className="mt-6 font-display text-2xl font-semibold">Programa de Aprendizagem</h3>
          <p className="mt-4 text-neutral-300">
            Com formação teórica e prática — e sem prejuízo para a formação escolar — preparamos e
            capacitamos adolescentes e jovens entre 14 e 24 anos para os desafios do mundo do
            trabalho.
          </p>
          <ul className="mt-6 space-y-3 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_YELLOW }} />
              Jornada compatível com os estudos
            </li>
            <li className="flex items-start gap-2">
              <Store className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_YELLOW }} />
              Vivência prática em ambiente real de loja
            </li>
            <li className="flex items-start gap-2">
              <Briefcase className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_YELLOW }} />
              Porta de entrada para a carreira profissional
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function QuemSomos() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Quem somos
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl">
            Supermercados Coelho Diniz
          </h2>
          <p className="mt-6 text-lg text-neutral-600">
            Através de um processo de Recrutamento e Seleção sério e transparente, buscamos
            profissionais que se comprometam com a satisfação dos clientes e com o crescimento da
            empresa — visando sempre a superação naquilo que nos propomos a fazer:{' '}
            <span className="font-semibold text-neutral-950">atender com qualidade</span>.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 bg-neutral-950 py-14 text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md font-display text-lg font-bold text-neutral-950"
              style={{ backgroundColor: BRAND_YELLOW }}
            >
              CD
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              Coelho Diniz <span style={{ color: BRAND_YELLOW }}>RH</span>
            </span>
          </div>
          <p className="mt-4 text-sm text-neutral-400">
            Recrutamento e seleção dos Supermercados Coelho Diniz.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
            Contato
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-neutral-300">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_YELLOW }} />
              Rua Marechal Floriano, 1495 - Centro
            </li>
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_YELLOW }} />
              (33) 3279-6101
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BRAND_YELLOW }} />
              <a href="mailto:vagas@coelhodiniz.com.br" className="hover:underline">
                vagas@coelhodiniz.com.br
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
            Acesso rápido
          </h4>
          <ul className="mt-4 space-y-3 text-sm text-neutral-300">
            <li>
              <a href="#vagas" className="hover:text-white">
                Vagas disponíveis
              </a>
            </li>
            <li>
              <Link to="/rh/login-candidato" className="hover:text-white">
                Área do candidato
              </Link>
            </li>
            <li>
              <Link to="/rh/login" className="hover:text-white">
                Acesso RH
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl border-t border-white/10 px-4 pt-6 text-xs text-neutral-500 sm:px-6">
        © {new Date().getFullYear()} Supermercados Coelho Diniz. Todos os direitos reservados.
      </div>
    </footer>
  );
}

export default function VagasPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Hero />
        <Vagas />
        <Inclusao />
        <QuemSomos />
      </main>
      <Footer />
    </div>
  );
}
