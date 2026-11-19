import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CircleHelp,
  Dices,
  Palette,
  Save,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";

import { PageTitle } from "@/components/rpg/AppShell";

export const Route = createFileRoute("/ajuda")({
  head: () => ({
    meta: [
      { title: "Ajuda e tutorial — Grimório" },
      {
        name: "description",
        content:
          "Aprenda a usar a ficha, os dados, os personagens salvos e a personalização visual do Grimório.",
      },
    ],
  }),
  component: HelpView,
});

function HelpView() {
  return (
    <div className="space-y-5 pb-4">
      <PageTitle
        title="Como usar o Grimório"
        subtitle="Um guia rápido para conhecer cada recurso, na web e no APK."
      />

      <section className="panel p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <CircleHelp className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="section-title">Comece por aqui</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Use as seções no topo em telas grandes ou a barra inferior no celular. Suas fichas e
              preferências ficam salvas no armazenamento local do navegador ou do aparelho; elas não
              são sincronizadas automaticamente entre dispositivos.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <GuideLink to="/">Abrir ficha</GuideLink>
          <GuideLink to="/dados">Abrir dados</GuideLink>
          <GuideLink to="/personagens">Ver personagens</GuideLink>
          <GuideLink to="/visual">Personalizar visual</GuideLink>
        </div>
      </section>

      <GuideSection icon={BookOpen} title="Ficha do personagem">
        <ul className="list-disc space-y-2 pl-5">
          <li>Toque nos campos para preencher nome, raça, classe, nível e outras informações.</li>
          <li>
            Use <strong>Editar estrutura</strong> para renomear, mover ou remover seções, renomear
            campos e criar novos campos de identidade. Também é possível adicionar seções de
            números, listas, habilidades, barras ou texto. Ao terminar, toque em
            <strong> Concluir edição</strong>.
          </li>
          <li>
            Nas seções de números, toque em <strong>d20</strong> para fazer um teste com o valor
            daquele campo. Em listas, registre itens e quantidades; no modo de edição, acrescente
            tags e descrições. Seções de habilidades guardam nome, origem e descrição, e seções de
            texto servem para anotações livres.
          </li>
          <li>
            Nas barras, ajuste o valor atual com os botões de menos e mais. O número no centro
            define quanto cada toque altera; no modo de edição, configure nome, valor máximo, cor e
            adicione ou remova barras.
          </li>
          <li>
            Toque no retrato para adicionar ou trocar a foto. Use o controle de remover junto à foto
            para excluí-la.
          </li>
          <li>
            Alterações na ficha aberta são guardadas neste aparelho. Se ela for um personagem salvo,
            use <strong>Salvar</strong> para atualizar também a cópia guardada em Personagens.
          </li>
        </ul>
      </GuideSection>

      <GuideSection icon={Dices} title="Mesa de dados">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Toque em d4, d6, d8, d10, d12, d20 ou d100 para montar uma rolagem; toque novamente para
            incluir mais dados.
          </li>
          <li>
            Ajuste a quantidade pelos botões de menos e mais e defina um modificador positivo ou
            negativo.
          </li>
          <li>
            Toque em <strong>Rolar</strong> para ver o total e os resultados. Vantagem e desvantagem
            fazem a rolagem correspondente.
          </li>
          <li>
            O histórico mostra as rolagens recentes feitas na mesa e na ficha. Você pode limpar o
            histórico ou recomeçar a seleção atual.
          </li>
        </ul>
      </GuideSection>

      <GuideSection icon={Users} title="Personagens e modelos">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Na ficha, escolha <strong>Guardar este personagem</strong> para abrir esta área.
          </li>
          <li>
            Dê um nome e use <strong>Salvar como está</strong> para guardar a ficha atual, ou
            <strong> Salvar em branco</strong> para guardar um modelo sem os valores preenchidos.
          </li>
          <li>
            Use <strong>Abrir</strong> para carregar uma ficha salva. Depois de editá-la, salve as
            alterações para atualizar esse personagem.
          </li>
          <li>
            <strong>Limpar valores</strong> mantém a estrutura e apaga os dados preenchidos;{" "}
            <strong>Restaurar padrão</strong> volta à ficha inicial.
          </li>
          <li>
            Apagar um personagem salvo é uma ação permanente para os dados locais daquele aparelho.
          </li>
        </ul>
      </GuideSection>

      <GuideSection icon={Palette} title="Visual e temas">
        <ul className="list-disc space-y-2 pl-5">
          <li>Escolha Automático ou uma paleta pronta para mudar o tema da aplicação.</li>
          <li>
            Personalize as cores de destaque, fundo, seções e letras; <strong>Restaurar</strong>{" "}
            remove as cores personalizadas.
          </li>
          <li>
            Escolha uma imagem de fundo e ajuste a cobertura para equilibrar a imagem com a leitura
            do texto.
          </li>
          <li>
            Em <strong>Meus visuais</strong>, nomeie e salve a aparência atual. Depois, aplique ou
            apague um visual salvo.
          </li>
        </ul>
      </GuideSection>

      <GuideSection icon={Sparkles} title="Criar personagem com IA — versão web">
        <p>
          Na versão web, toque em <strong>Criar com IA</strong>, descreva a ideia do personagem e
          escolha o sistema e o nível. Revise o resultado antes de aplicá-lo. Aplicar substitui a
          ficha aberta (preservando a foto); para manter esse personagem, salve-o em Personagens.
        </p>
        <p className="mt-2">
          A geração depende de conexão com a internet, da disponibilidade do serviço e dos limites
          configurados para a IA. Se falhar ou demorar, tente novamente mais tarde.
        </p>
        <p className="mt-2">
          A ideia, o sistema e o nível informados são enviados pelo servidor a um provedor externo
          de IA para gerar a resposta. Evite incluir dados pessoais ou informações confidenciais na
          descrição. O provedor pode aplicar seus próprios termos de uso e retenção.
        </p>
      </GuideSection>

      <section className="panel p-4 sm:p-5">
        <h2 className="section-title flex items-center gap-2">
          <Smartphone className="size-5 text-primary" /> Web, APK e seus dados
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <h3 className="font-semibold">Versão web</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Inclui criação por IA. A IA precisa de internet e pode estar sujeita a limites de uso.
              O navegador guarda os dados localmente.
            </p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <h3 className="font-semibold">Aplicativo APK</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Inclui ficha, dados, personagens e temas. A criação por IA não aparece no APK; os
              recursos locais usam o armazenamento do próprio aparelho.
            </p>
          </div>
        </div>
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          Como os dados ficam no navegador ou aparelho, limpe os dados do app/navegador somente se
          quiser apagar suas fichas e preferências. Para usar em outro dispositivo, será necessário
          recriar os dados manualmente.
        </p>
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          <Save className="mt-0.5 size-4 shrink-0 text-primary" />
          Dica: mantenha personagens importantes salvos e confira o indicador <strong>Salvo</strong>
          ou <strong>Salvar</strong> no topo da ficha.
        </p>
      </section>
    </div>
  );
}

function GuideSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel p-4 sm:p-5">
      <h2 className="section-title mb-3 flex items-center gap-2">
        <Icon className="size-5 text-primary" /> {title}
      </h2>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function GuideLink({
  to,
  children,
}: {
  to: "/" | "/dados" | "/personagens" | "/visual";
  children: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-full border border-border px-3 py-1.5 text-sm font-semibold transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary"
    >
      {children}
    </Link>
  );
}
