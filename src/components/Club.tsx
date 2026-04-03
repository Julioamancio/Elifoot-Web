import React from 'react';
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

export function Club() {
  const teams = useGameStore(state => state.teams);
  const userTeamId = useGameStore(state => state.userTeamId);
  const upgradeStadium = useGameStore(state => state.upgradeStadium);
  const updateClubPrice = useGameStore(state => state.updateClubPrice);
  const currentYear = useGameStore(state => state.currentYear ?? 2026);
  const currentWeek = useGameStore(state => state.currentWeek);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clube e Estádio"
        subtitle="Finanças, patrocínios, operação comercial e decisões estruturais do clube."
        icon={<Building2 className="h-7 w-7" />}
        aside={
          <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2">
            <span className="mr-2 text-sm text-slate-400">Saldo:</span>
            <span className="font-bold text-emerald-400">{formatCurrency(userTeam.finances)}</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard label="Saldo" value={formatCurrency(userTeam.finances)} tone="emerald" />
        <MetricCard label="Torcida estimada" value={formatFans(userTeam.fanBase ?? 0)} tone="sky" />
        <MetricCard label="Receita comercial" value={formatCurrency(projectedCommercial.totalRevenue)} subtitle="projeção semanal" />
        <MetricCard label="Demanda atual" value={`${Math.round(currentDemand * 100)}%`} subtitle="interesse do mercado" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900/50 px-6 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100">
              <BadgeDollarSign className="h-5 w-5 text-emerald-400" />
              Patrocínios
            </h3>
            <p className="text-sm text-slate-400">Estrutura comercial da temporada {currentYear}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Total anual</p>
            <p className="text-lg font-bold text-emerald-400">{formatCurrency(sponsorIncome)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-3">
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
                  <span>Contrato até {sponsor.contractEndYear}</span>
                </div>
                <div className="flex items-start gap-3 text-slate-300">
                  <Target className="mt-0.5 h-4 w-4 text-amber-400" />
                  <span>{sponsor.goalDescription}</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2 text-xs text-slate-400">
                Última avaliação:{' '}
                <span className={sponsor.lastSeasonGoalMet === false ? 'font-bold text-rose-400' : 'font-bold text-emerald-400'}>
                  {sponsor.lastSeasonGoalMet === false ? 'meta nao cumprida' : 'meta em dia'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800">
        <div className="border-b border-slate-700 bg-slate-900/50 px-6 py-4">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-100">
            <Store className="h-5 w-5 text-emerald-400" />
            Operação comercial sem estádio
          </h3>
          <p className="text-sm text-slate-400">
            Camisas, acessorios, socio-torcedor e conteudo digital seguem rendendo mesmo sem arena propria.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 xl:grid-cols-2">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <MetricCard label="Última renda" value={formatCurrency(lastCommercial?.totalRevenue ?? 0)} subtitle="semana anterior" tone="emerald" />
              <MetricCard label="Projeção atual" value={formatCurrency(projectedCommercial.totalRevenue)} subtitle={`semana ${currentWeek}`} tone="sky" />
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Leitura de demanda</p>
              <p className="mt-3 text-sm text-slate-300">
                A procura depende do tamanho da torcida, da divisão, do preço que você definiu e do desempenho esportivo do clube.
              </p>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-500"
                  style={{ width: `${Math.max(18, Math.min(100, projectedCommercial.demandScore * 58))}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-medium text-emerald-400">
                Interesse estimado: {Math.round(projectedCommercial.demandScore * 100)}%
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <RevenueLine label="Camisas" value={projectedCommercial.shirtsRevenue} />
              <RevenueLine label="Acessorios" value={projectedCommercial.accessoriesRevenue} />
              <RevenueLine label="Socio-torcedor" value={projectedCommercial.membershipsRevenue} />
              <RevenueLine label="Conteudo digital" value={projectedCommercial.digitalRevenue} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Definir preços</p>
            <div className="mt-5 space-y-4">
              <PriceControl
                label="Preço da camisa"
                icon={<Store className="h-4 w-4 text-emerald-400" />}
                value={userTeam.commercial?.shirtPrice ?? 0}
                min={30}
                max={500}
                onChange={value => updateClubPrice('shirtPrice', value)}
                helper="Preço alto aumenta margem, mas pode derrubar a demanda."
              />
              <PriceControl
                label="Preço dos acessórios"
                icon={<BadgeDollarSign className="h-4 w-4 text-sky-400" />}
                value={userTeam.commercial?.accessoryPrice ?? 0}
                min={10}
                max={180}
                onChange={value => updateClubPrice('accessoryPrice', value)}
                helper="Bonés, canecas e pequenos itens oficiais."
              />
              <PriceControl
                label="Sócio-torcedor mensal"
                icon={<Users className="h-4 w-4 text-amber-400" />}
                value={userTeam.commercial?.membershipPrice ?? 0}
                min={5}
                max={120}
                onChange={value => updateClubPrice('membershipPrice', value)}
                helper="Mais barato atrai base maior; mais caro aumenta receita por fã fiel."
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
          </div>
        </div>
      </section>

      {!userTeam.stadium ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-700">
            <Building2 className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="mb-2 text-xl font-bold text-slate-200">Sem estádio próprio</h3>
          <p className="mx-auto mb-6 max-w-xl text-slate-400">
            Seu clube ainda pode ganhar dinheiro com torcida, camisas, sócios e conteúdo digital. Ter um estádio próprio adiciona bilheteria, alimentação e loja em dia de jogo.
          </p>
          <button
            onClick={() => upgradeStadium('build')}
            disabled={userTeam.finances < 5000000}
            className="mx-auto flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            Construir Estádio ({formatCurrency(5000000)})
          </button>
          {userTeam.finances < 5000000 && (
            <p className="mt-3 flex items-center justify-center gap-1 text-sm text-red-400">
              <AlertCircle className="h-4 w-4" /> Fundos insuficientes
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-1">
            <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <div className="absolute right-0 top-0 -z-10 h-32 w-32 rounded-bl-full bg-emerald-500/10" />
              <h3 className="mb-1 text-xl font-bold text-slate-100">{userTeam.stadium.name}</h3>
              <p className="mb-6 text-sm text-slate-400">Estádio oficial do clube</p>

              <div className="space-y-4">
                <div>
                  <div className="mb-1 text-xs font-bold uppercase text-slate-400">Capacidade</div>
                  <div className="text-2xl font-bold text-slate-200">
                    {userTeam.stadium.capacity.toLocaleString('pt-BR')} <span className="text-sm font-normal text-slate-500">lugares</span>
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-xs font-bold uppercase text-slate-400">Preço do ingresso</div>
                  <div className="text-xl font-bold text-emerald-400">{formatCurrency(userTeam.stadium.ticketPrice)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-5">
              <PriceControl
                label="Preço do ingresso"
                icon={<Ticket className="h-4 w-4 text-emerald-400" />}
                value={userTeam.stadium.ticketPrice}
                min={10}
                max={250}
                onChange={value => updateClubPrice('ticketPrice', value)}
                helper="Preço justo aumenta lotação. Preço alto aumenta margem, mas pode afastar público."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-2">
            <div className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-blue-500/20 p-3 text-blue-400">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-200">Expandir arquibancada</h4>
                  <p className="text-xs text-slate-400">+5.000 lugares</p>
                </div>
              </div>
              <div className="mt-auto pt-4">
                <button
                  onClick={() => upgradeStadium('capacity')}
                  disabled={userTeam.finances < 2000000}
                  className="w-full rounded-lg bg-slate-700 py-2 font-medium text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Expandir ({formatCurrency(2000000)})
                </button>
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-orange-500/20 p-3 text-orange-400">
                  <UtensilsCrossed className="h-6 w-6" />
                </div>
                <div>
                          <h4 className="font-bold text-slate-200">Praça de alimentação</h4>
                          <p className="text-xs text-slate-400">Nível {userTeam.stadium.foodLevel}/5</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-400">Aumenta a receita por torcedor presente nos jogos em casa.</p>
              <div className="mt-auto">
                <button
                  onClick={() => upgradeStadium('food')}
                  disabled={userTeam.finances < 1000000 || userTeam.stadium.foodLevel >= 5}
                  className="w-full rounded-lg bg-slate-700 py-2 font-medium text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {userTeam.stadium.foodLevel >= 5 ? 'Nivel maximo' : `Melhorar (${formatCurrency(1000000)})`}
                </button>
              </div>
            </div>

            <div className="flex flex-col rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-purple-500/20 p-3 text-purple-400">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                        <h4 className="font-bold text-slate-200">Loja oficial no estádio</h4>
                        <p className="text-xs text-slate-400">Nível {userTeam.stadium.merchLevel}/5</p>
                </div>
              </div>
              <p className="mb-4 text-sm text-slate-400">Eleva a renda de produtos vendidos em dia de mando.</p>
              <div className="mt-auto">
                <button
                  onClick={() => upgradeStadium('merch')}
                  disabled={userTeam.finances < 1500000 || userTeam.stadium.merchLevel >= 5}
                  className="w-full rounded-lg bg-slate-700 py-2 font-medium text-white transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {userTeam.stadium.merchLevel >= 5 ? 'Nivel maximo' : `Melhorar (${formatCurrency(1500000)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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

      <div className="mt-3 flex items-center gap-3">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={event => onChange(Number(event.target.value))}
          className="w-32 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
        />
        <p className="text-xs text-slate-400">{helper}</p>
      </div>
    </div>
  );
}
