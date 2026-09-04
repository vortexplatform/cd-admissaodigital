import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  GraduationCap,
  HeartHandshake,
  Mail,
  MapPin,
  Menu,
  Phone,
} from 'lucide-react';

const BRAND_YELLOW = '#f5c400';

const vagasDestaque = [
  { cargo: 'Açougueiro', image: 'ico_acougue.jpg' },
  { cargo: 'Auxiliar de Depósito', image: 'ico_deposito.jpg' },
  { cargo: 'Auxiliar de Frios', image: 'ico_frios.jpg' },
  { cargo: 'Auxiliar de Hortifruti', image: 'ico_hotrifruti.jpg' },
  { cargo: 'Auxiliar de Limpeza', image: 'ico_limpeza.jpg' },
  { cargo: 'Auxiliar de Padaria', image: 'auxiliar-de-padaria.jpg' },
  { cargo: 'Embalador', image: 'embalador.jpg' },
  { cargo: 'Operador de Caixa', image: 'ico_operadora-caixa.jpg' },
  { cargo: 'Padeiro', image: 'ico_padaria.jpg' },
  { cargo: 'Prevenção e Perdas', image: 'ico_prevencao-perdas.jpg' },
  { cargo: 'Repositor', image: 'ico_repositor.jpg' },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Coelho Diniz RH, início">
      <img
        src="/images/logo-coelho-diniz.png"
        alt="Coelho Diniz"
        className="h-auto w-[160px] rounded-sm"
      />
    </Link>
  );
}

function Header() {
  return (
    <header className="absolute inset-x-0 top-0 z-20">
      <div className="mx-auto flex max-w-content items-center justify-between px-5 py-5 sm:px-8 lg:py-7">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm font-medium text-white/80 lg:flex" aria-label="Navegação principal">
          <Link to="/" className="text-white transition-colors hover:text-yellow-300">HOME</Link>
          <a href="#vagas" className="transition-colors hover:text-white">Vagas disponíveis</a>
           <Link to="/candidatar" className="rounded-pill px-4 py-2.5 font-semibold text-ink transition-opacity hover:opacity-90" style={{ backgroundColor: BRAND_YELLOW }}>
             Candidatar a vagas
           </Link>
        </nav>
        <details className="relative lg:hidden">
          <summary className="flex list-none cursor-pointer rounded-md border border-white/25 p-2 text-white" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </summary>
          <nav className="absolute right-0 top-12 flex w-56 flex-col gap-1 rounded-lg border border-white/10 bg-inverse-surface p-2 text-sm text-white shadow-xl" aria-label="Navegação mobile">
            <Link to="/" className="rounded-md px-3 py-2 hover:bg-white/10">HOME</Link>
            <a href="#vagas" className="rounded-md px-3 py-2 hover:bg-white/10">Vagas disponíveis</a>
             <Link to="/candidatar" className="mt-1 rounded-md px-3 py-2 text-left font-semibold text-ink" style={{ backgroundColor: BRAND_YELLOW }}>Candidatar a vagas</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate h-[360px] overflow-hidden bg-inverse-canvas sm:h-[470px] lg:h-[560px]">
      <img src="/images/banner-02.jpg" alt="Campanha de recrutamento Coelho Diniz" className="h-full w-full object-cover object-center" />
    </section>
  );
}

function Vagas() {
  return (
    <section id="vagas" className="bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-[1840px] px-6 sm:px-10 lg:px-12">
        <h2 className="text-center font-display text-[38px] font-bold uppercase tracking-tight text-ink">Vagas disponíveis</h2>
        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4 lg:gap-x-12 lg:gap-y-10">
          {vagasDestaque.map((vaga) => (
             <Link to="/candidatar" state={{ vaga: vaga.cargo }} key={vaga.cargo} className="group overflow-hidden bg-[#f1f1f1] text-center transition-transform hover:-translate-y-1 hover:shadow-md">
              <div className="aspect-[1.48] overflow-hidden bg-surface-2">
                <img src={`/images/vagas/${vaga.image}`} alt={`Imagem ilustrativa para a vaga de ${vaga.cargo}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>
              <div className="flex min-h-[164px] flex-col items-center px-4 py-4 sm:min-h-[172px]">
                <h3 className="font-display text-xl font-bold uppercase leading-tight tracking-tight text-ink sm:text-[22px]">{vaga.cargo}</h3>
                <span className="mt-4 inline-flex min-w-[170px] items-center justify-center rounded-md px-5 py-3 text-lg font-medium uppercase text-ink shadow-sm transition-colors group-hover:bg-[#e0b400]" style={{ backgroundColor: BRAND_YELLOW }}>Saber mais...</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Inclusao() {
  return (
    <section id="cultura" className="bg-surface-1 py-16 sm:py-24">
      <div className="mx-auto grid max-w-content items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_500px] lg:gap-20">
        <div>
          <HeartHandshake className="h-8 w-8 text-report-orange" />
          <p className="mt-7 text-eyebrow uppercase tracking-[.18em] text-ink-muted">Inclusão para transformar</p>
          <h2 className="mt-4 max-w-xl font-display text-headline font-semibold text-ink sm:text-display-md">Oportunidades para todos os talentos.</h2>
          <p className="mt-6 max-w-2xl text-body-lg text-ink-muted">Você sabia que a Lei nº 8.213/91 prevê que Empresas destinem cotas de vagas para pessoas com deficiência (PCD)? Ciente de nossas responsabilidades e preocupado com a integração e inclusão destas pessoas, o Supermercado Coelho Diniz oferece condições de trabalho e oportunidades para PCD´S. Se você ou alguma pessoa que você conheça se encaixa neste quadro, indique-nos pois também gostaríamos muito de conhece-los.</p>
           <Link to="/candidatar" className="mt-8 inline-flex items-center gap-2 rounded-md px-5 py-3 text-button font-semibold text-ink" style={{ backgroundColor: BRAND_YELLOW }}>Quero participar <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <div className="overflow-hidden rounded-xl bg-inverse-canvas shadow-sm">
          <img src="/images/vagas_pcd.jpg" alt="Vaga para pessoa com deficiência no Coelho Diniz" className="h-auto w-full" />
        </div>
      </div>
    </section>
  );
}

function Aprendizagem() {
  return (
    <section className="border-t border-hairline bg-canvas py-16 sm:py-24">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <div className="max-w-3xl">
          <GraduationCap className="h-8 w-8 text-report-orange" />
          <p className="mt-7 text-eyebrow uppercase tracking-[.18em] text-ink-muted">Primeiros passos</p>
          <h2 className="mt-4 max-w-xl font-display text-headline font-semibold text-ink sm:text-display-md">Programa de aprendizagem</h2>
          <p className="mt-6 max-w-2xl text-body-lg text-ink-muted">Com formação teórica e prática e sem prejuízo para a formação escolar, preparamos e capacitamos adolescentes e jovens entre 14 e 24 anos para os desafios do mundo do trabalho.</p>
        </div>
        <ul className="mt-8 grid gap-4 border-t border-hairline pt-6 text-body-sm text-ink sm:grid-cols-3 sm:gap-6">
          {['Jornada compatível com os estudos', 'Vivência prática em loja', 'Porta de entrada para a carreira'].map((item) => <li key={item} className="flex items-start gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-report-orange" />{item}</li>)}
        </ul>
      </div>
    </section>
  );
}

function QuemSomos() {
  return (
    <section className="border-t border-hairline bg-canvas py-16 sm:py-24">
      <div className="mx-auto max-w-content px-5 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-eyebrow uppercase tracking-[.18em] text-ink-muted">Quem somos</p>
          <h2 className="mt-4 max-w-xl font-display text-headline font-semibold tracking-tight text-ink sm:text-display-md">Supermercados Coelho Diniz</h2>
          <p className="mt-6 max-w-2xl text-body-lg text-ink-muted">Através de um processo de recrutamento e seleção sério e transparente, buscamos profissionais comprometidos com a satisfação dos clientes e com o crescimento da empresa.</p>
        </div>
        <p className="mt-8 border-t border-hairline pt-6 text-2xl font-semibold leading-tight tracking-tight text-ink sm:text-3xl">Nosso jeito de fazer é simples: <strong className="text-report-orange">atender com qualidade.</strong></p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-inverse-canvas py-12 text-white">
      <div className="mx-auto grid max-w-content gap-10 px-5 sm:px-8 md:grid-cols-[1.2fr_.8fr_.8fr]">
        <div><Brand /><p className="mt-5 max-w-xs text-body-sm text-white/50">Recrutamento e seleção dos Supermercados Coelho Diniz.</p></div>
        <div><h3 className="text-eyebrow uppercase tracking-[.18em] text-white/40">Contato</h3><ul className="mt-4 space-y-3 text-body-sm text-white/70"><li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-yellow-300" />Rua Marechal Floriano, 1495 - Centro</li><li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-yellow-300" />(33) 3279-6101</li><li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-yellow-300" /><a href="mailto:vagas@coelhodiniz.com.br" className="hover:text-white">vagas@coelhodiniz.com.br</a></li></ul></div>
        <div><h3 className="text-eyebrow uppercase tracking-[.18em] text-white/40">Acesso rápido</h3><ul className="mt-4 space-y-3 text-body-sm text-white/70"><li><a href="#vagas" className="hover:text-white">Vagas disponíveis</a></li><li><Link to="/rh/login-candidato" className="hover:text-white">Área do candidato</Link></li><li><Link to="/rh/login" className="hover:text-white">Acesso RH</Link></li></ul></div>
      </div>
      <div className="mx-auto mt-12 max-w-content border-t border-white/10 px-5 pt-6 text-caption text-white/35 sm:px-8">© {new Date().getFullYear()} Supermercados Coelho Diniz. Todos os direitos reservados.</div>
    </footer>
  );
}

export default function VagasPage() {
  return <div className="home-montserrat min-h-screen bg-canvas"><Header /><main><Hero /><Vagas /><Inclusao /><Aprendizagem /><QuemSomos /></main><Footer /></div>;
}
