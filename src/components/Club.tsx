import React, { useState } from 'react';
import {
  AlertCircle,
  BadgeDollarSign,
  Building2,
  CalendarClock,
  Plus,
  Store,
  Target,
  Ticket,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { useGameStore } from '../store/useGameStore';
import { getSponsorSlotLabel, getTeamSponsorIncome } from '../game/sponsorship';
import { ensureTeamCommercial, estimateWeeklyCommercialRevenue, getCommercialDemandScore } from '../game/commercial';
import { PageHeader } from './ui/PageHeader';
import { ScreenTabs } from './ui/ScreenTabs';

type ClubTab = 'overview' | 'commercial' | 'sponsors' | 'stadium';

export function Club() {
  const teams = useGameStore(state => state.teams);
  const userTeamId = useGameStore(state => state.userTeamId);
  const upgradeStadium = useGameStore(state => state.upgradeStadium);
  const updateClubPrice = useGameStore(state => state.updateClubPrice);
  const currentYear = useGameStore(state => state.currentYear ?? 2026);
  const currentWeek = useGameStore(state => state.currentWeek);
  const [activeTab, setActiveTab] = useState<ClubTab>('overview');
  const rawUserTeam = teams.find(team => team.id === userTeamId);

  if (!rawUserTeam) return null;

  const userTeam = ensureTeamCommercial(rawUserTeam);
  const sponsors = [...(userTeam.sponsors ?? [])].sort((sponsorA, sponsorB) => sponsorB.seasonPayment - sponsorA.seasonPayment);
  const sponsorIncome = getTeamSponsorIncome(userTeam);
  const projectedCommercial = estimateWeeklyCommercialRevenue(userTeam, currentWeek);
  const currentDemand = getCommercialDemandScore(userTeam);
  const lastCommercial = userTeam.commercial?.lastWeeklyReport;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);

  const formatFans = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      notation: value >= 100_000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(value);

  const tabs = [
    { id: 'overview', label: 'Visao Geral', icon: <Building2 className="h-4 w-4" /> },
    { id: 'commercial', label: 'Comercial', icon: <Store className="h-4 w-4" /> },
    { id: 'sponsors', label: 'Patrocinios', icon: <BadgeDollarSign className="h-4 w-4" />, badge: sponsors.length },
    { id: 'stadium', label: 'Estadio', icon: <Ticket className="h-4 w-4" /> },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clube e Estadio"
        subtitle="Tudo separado em modulos para caber melhor no mobile sem perder nenhuma informacao."
        icon={<Building2 className="h-7 w-7" />}
        aside={
          <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2">
            <span className="mr-2 text-sm text-slate-400">Saldo:</span>
            <span className="font-bold text-emerald-400">{formatCurrency(userTeam.finances)}</span>
          </div>
        }
      />

      <ScreenTabs items={tabs} activeTab={activeTab} onChange={tab => setActiveTab(tab as ClubTab)} />

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <MetricCard label="Saldo" value={formatCurrency(userTeam.finances)} tone="emerald" />
            <MetricCard label="Torcida estimada" value={formatFans(userTeam.fanBase ?? 0)} tone="sky" />
            <MetricCard label="Receita comercial" value={formatCurrency(projectedCommercial.totalRevenue)} subtitle="projecao semanal" />
            <MetricCard label="Demanda atual" value={`${Math.round(currentDemand * 100)}%`} subtitle="interesse do mercado" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="Resumo comercial" subtitle="Quanto o clube ja consegue gerar mesmo sem depender de estadio proprio.">
              <div className="grid grid-cols-2 gap-4">
                <MetricCard label="Ultima renda" value={formatCurrency(lastCommercial?.totalRevenue ?? 0)} subtitle="semana anterior" tone="emerald" />
                <MetricCard label="Projecao atual" value={formatCurrency(projectedCommercial.totalRevenue)} subtitle={`semana ${currentWeek}`} tone="sky" />
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                  style={{ width: `${Math.max(18, Math.min(100, projectedCommercial.demandScore * 58))}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-medium text-emerald-400">
                Interesse estimado: {Math.round(projectedCommercial.demandScore * 100)}%
              </p>
            </SectionCard>

            <SectionCard title="Panorama estrutural" subtitle="Patrocinios, torcida e estadio em leitura curta.">
              <div className="grid grid-cols-2 gap-4">
                <MiniMetric label="Patrocinios ativos" value={sponsors.length} />
                <MiniMetric label="Renda anual" value={formatCurrency(sponsorIncome)} accent="emerald" />
                <MiniMetric label="Estadio proprio" value={userTeam.stadium ? 'Sim' : 'Nao'} />
                <MiniMetric label="Ano atual" value={currentYear} />
              </div>
            </SectionCard>
          </div>
        </div>
      )}

      {activeTab === 'commercial' && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard title="Operacao comercial" subtitle="Camisas, acessorios, socio-torcedor e digital.">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RevenueLine label="Camisas" value={projectedCommercial.shirtsRevenue} />
              <RevenueLine label="Acessorios" value={projectedCommercial.accessoriesRevenue} />
              <RevenueLine label="Socio-torcedor" value={projectedCommercial.membershipsRevenue} />
              <RevenueLine label="Conteudo digital" value={projectedCommercial.digitalRevenue} />
            </div>
          </SectionCard>

          <SectionCard title="Definir precos" subtitle="Ajuste os valores sem perder a leitura no celular.">
            <div className="space-y-4">
              <PriceControl
                label="Preco da camisa"
                icon={<Store className="h-4 w-4 text-emerald-400" />}
                value={userTeam.commercial?.shirtPrice ?? 0}
                min={30}
                max={500}
                onChange={value => updateClubPrice('shirtPrice', value)}
                helper="Preco alto aumenta margem, mas pode derrubar a demanda."
              />
              <PriceControl
                label="Preco dos acessorios"
                icon={<BadgeDollarSign className="h-4 w-4 text-sky-400" />}
                value={userTeam.commercial?.accessoryPrice ?? 0}
                min={10}
                max={180}
                onChange={value => updateClubPrice('accessoryPrice', value)}
                helper="Bones, canecas e pequenos itens oficiais."
              />
              <PriceControl
                label="Socio-torcedor mensal"
                icon={<Users className="h-4 w-4 text-amber-400" />}
                value={userTeam.commercial?.membershipPrice ?? 0}
                min={5}
                max={120}
                onChange={value => updateClubPrice('membershipPrice', value)}
                helper="Mais barato atrai base maior; mais caro aumenta receita por fa fiel."
              />
              <PriceControl
                label="Plano digital"
                icon={<Building2 className="h-4 w-4 text-purple-400" />}
                value={userTeam.commercial?.digitalPrice ?? 0}
                min={3}
                max={80}
                onChange={value => updateClubPrice('digitalPrice', value)}
                helper="Conteudo, bastidores e streaming do clube."
              />
            </div>
          </SectionCard>
        </div>
      )}

      {activeTab === 'sponsors' && (
        <SectionCard title="Patrocinios" subtitle={`Estrutura comercial da temporada ${currentYear}.`}>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {sponsors.map(sponsor => (
              <div key={sponsor.id} className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                      {getSponsorSlotLabel(sponsor.slot)}
                    </p>
                    <h4 className="mt-2 text-lg font-bold text-slate-100">{sponsor.name}</h4>
                  </div>
                  <span className="rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-bold text-slate-300">
                    Tier {sponsor.tier}
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-slate-300">
                    <BadgeDollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="font-medium">{formatCurrency(sponsor.seasonPayment)} por temporada</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <CalendarClock className="h-4 w-4 text-sky-400" />
                    <span>Contrato ate {sponsor.contractEndYear}</span>
                  </div>
                  <div className="flex items-start gap-3 text-slate-300">
                    <Target className="mt-0.5 h-4 w-4 text-amber-400" />
                    <span>{sponsor.goalDescription}</span>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-400">
                  Ultima avaliacao:{' '}
                  <span className={sponsor.lastSeasonGoalMet === false ? 'font-bold text-rose-400' : 'font-bold text-emerald-400'}>
                    {sponsor.lastSeasonGoalMet === false ? 'meta nao cumprida' : 'meta em dia'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {activeTab === 'stadium' && (
        <>
          {!userTeam.stadium ? (
            <SectionCard title="Sem estadio proprio" subtitle="Seu clube ainda pode crescer sem arena, mas ter uma ajuda muito.">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
                <p className="mx-auto mb-6 max-w-xl text-slate-400">
                  Seu clube ainda pode ganhar dinheiro com torcida, camisas, socios e conteudo digital. Ter um estadio proprio adiciona bilheteria, alimentacao e loja em dia de jogo.
                </p>
                <button
                  onClick={() => upgradeStadium('build')}
                  disabled={userTeam.finances < 5000000}
                  className="mx-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-5 w-5" />
                  Construir Estadio ({formatCurrency(5000000)})
                </button>
                {userTeam.finances < 5000000 && (
                  <p className="mt-3 flex items-center justify-center gap-1 text-sm text-red-400">
                    <AlertCircle className="h-4 w-4" /> Fundos insuficientes
                  </p>
                )}
              </div>
            </SectionCard>
          ) : (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <SectionCard title={userTeam.stadium.name} subtitle="Estadio oficial do clube.">
                <div className="space-y-5">
                  <MiniMetric label="Capacidade" value={`${userTeam.stadium.capacity.toLocaleString('pt-BR')} lugares`} />
                  <MiniMetric label="Preco do ingresso" value={formatCurrency(userTeam.stadium.ticketPrice)} accent="emerald" />
                  <PriceControl
                    label="Preco do ingresso"
                    icon={<Ticket className="h-4 w-4 text-emerald-400" />}
                    value={userTeam.stadium.ticketPrice}
                    min={10}
                    max={250}
                    onChange={value => updateClubPrice('ticketPrice', value)}
                    helper="Preco justo aumenta lotacao. Preco alto aumenta margem, mas pode afastar publico."
                  />
                </div>
              </SectionCard>

              <SectionCard title="Melhorias do estadio" subtitle="Expansao, alimentacao e loja oficial.">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <UpgradeCard
                    icon={<Building2 className="h-6 w-6" />}
                    tone="blue"
                    title="Expandir arquibancada"
                    subtitle="+5.000 lugares"
                    buttonLabel={`Expandir (${formatCurrency(2000000)})`}
                    onClick={() => upgradeStadium('capacity')}
                    disabled={userTeam.finances < 2000000}
                  />
                  <UpgradeCard
                    icon={<UtensilsCrossed className="h-6 w-6" />}
                    tone="orange"
                    title="Praca de alimentacao"
                    subtitle={`Nivel ${userTeam.stadium.foodLevel}/5`}
                    description="Aumenta a receita por torcedor presente nos jogos em casa."
                    buttonLabel={userTeam.stadium.foodLevel >= 5 ? 'Nivel maximo' : `Melhorar (${formatCurrency(1000000)})`}
                    onClick={() => upgradeStadium('food')}
                    disabled={userTeam.finances < 1000000 || userTeam.stadium.foodLevel >= 5}
                  />
                  <UpgradeCard
                    icon={<Store className="h-6 w-6" />}
                    tone="purple"
                    title="Loja oficial no estadio"
                    subtitle={`Nivel ${userTeam.stadium.merchLevel}/5`}
                    description="Eleva a renda de produtos vendidos em dia de mando."
                    buttonLabel={userTeam.stadium.merchLevel >= 5 ? 'Nivel maximo' : `Melhorar (${formatCurrency(1500000)})`}
                    onClick={() => upgradeStadium('merch')}
                    disabled={userTeam.finances < 1500000 || userTeam.stadium.merchLevel >= 5}
                  />
                </div>
              </SectionCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
      <div className="border-b border-slate-700 bg-slate-900/50 px-6 py-4">
        <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  tone = 'slate',
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: 'slate' | 'emerald' | 'sky';
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-400' : tone === 'sky' ? 'text-sky-400' : 'text-slate-100';

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${toneClass}`}>{value}</p>
      {subtitle && <p className="mt-1 text-sm text-slate-400">{subtitle}</p>}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  accent = 'slate',
}: {
  label: string;
  value: React.ReactNode;
  accent?: 'slate' | 'emerald';
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-black ${accent === 'emerald' ? 'text-emerald-400' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}

function RevenueLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-100">
        {new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          maximumFractionDigits: 0,
        }).format(value)}
      </p>
    </div>
  );
}

function PriceControl({
  label,
  icon,
  value,
  min,
  max,
  helper,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  helper: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {icon}
          <p className="font-semibold text-slate-100">{label}</p>
        </div>
        <span className="text-sm font-bold text-emerald-400">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0,
          }).format(value)}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-emerald-500"
      />

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={event => onChange(Number(event.target.value))}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none sm:w-32"
        />
        <p className="text-xs text-slate-400">{helper}</p>
      </div>
    </div>
  );
}

function UpgradeCard({
  icon,
  title,
  subtitle,
  description,
  buttonLabel,
  onClick,
  disabled,
  tone,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description?: string;
  buttonLabel: string;
  onClick: () => void;
  disabled: boolean;
  tone: 'blue' | 'orange' | 'purple';
}) {
  const toneClass =
    tone === 'blue'
      ? 'bg-blue-500/20 text-blue-400'
      : tone === 'orange'
        ? 'bg-orange-500/20 text-orange-400'
        : 'bg-purple-500/20 text-purple-400';

  return (
    <div className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800 p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className={`rounded-xl p-3 ${toneClass}`}>{icon}</div>
        <div>
          <h4 className="font-bold text-slate-200">{title}</h4>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      {description ? <p className="mb-4 text-sm text-slate-400">{description}</p> : null}
      <div className="mt-auto pt-4">
        <button
          onClick={onClick}
          disabled={disabled}
          className="w-full rounded-lg bg-slate-700 py-2 font-medium text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
