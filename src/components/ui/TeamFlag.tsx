import React, { useEffect, useMemo, useState } from 'react';
import defaultTeamBadge from '../../assets/default-team-badge.svg';
import { cn } from '../../lib/utils';
import { getCountryFlagUrl, getTeamBadgeUrl } from '../../lib/teamVisuals';

type TeamFlagSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<TeamFlagSize, string> = {
  xs: 'h-5 w-5',
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
};

interface TeamFlagProps {
  country?: string | null;
  teamName?: string;
  size?: TeamFlagSize;
  className?: string;
}

export function TeamFlag({ country, teamName, size = 'sm', className }: TeamFlagProps) {
  const [badgeSrc, setBadgeSrc] = useState<string | null>(null);
  const [imageStage, setImageStage] = useState<'badge' | 'flag' | 'default'>('badge');

  useEffect(() => {
    setBadgeSrc(null);
    setImageStage('badge');
  }, [country, teamName]);

  useEffect(() => {
    let isMounted = true;

    if (!teamName) return;

    getTeamBadgeUrl(teamName, country).then(result => {
      if (!isMounted) return;
      setBadgeSrc(result);
    });

    return () => {
      isMounted = false;
    };
  }, [country, teamName]);

  const countryFlagSrc = useMemo(() => getCountryFlagUrl(country, 40), [country]);
  const src =
    imageStage === 'badge' && badgeSrc
      ? badgeSrc
      : imageStage !== 'default' && countryFlagSrc
        ? countryFlagSrc
        : defaultTeamBadge;
  const alt =
    imageStage === 'badge' && badgeSrc
      ? teamName
        ? `Escudo de ${teamName}`
        : 'Escudo do time'
      : teamName
        ? `Bandeira/brasao de ${teamName}`
        : 'Bandeira/brasao do time';

  return (
    <span
      className={cn(
        'inline-flex shrink-0 overflow-hidden rounded-xl border border-white/10 bg-slate-950/80 p-0.5 shadow-sm',
        SIZE_CLASSES[size],
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        title={country ? `${teamName ?? 'Time'} • ${country}` : teamName ?? 'Time'}
        loading="lazy"
        decoding="async"
        className="h-full w-full rounded-[10px] object-contain bg-slate-950/70"
        onError={() => {
          if (imageStage === 'badge') {
            setImageStage(countryFlagSrc ? 'flag' : 'default');
            return;
          }

          if (imageStage === 'flag') {
            setImageStage('default');
          }
        }}
      />
    </span>
  );
}
