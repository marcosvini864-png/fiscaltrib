import { useState } from 'react'

// ── DESIGN SYSTEM ÚNICO — e-FiscalTribe ─────────────────────────────────────
// Este componente é a base visual de TODAS as telas de funcionalidade/tese.
// Nenhuma tela deve ter banner, gradiente ou cor própria — a única
// diferenciação permitida é o ícone pequeno ao lado do título.

export const DS = {
  bg: '#F8FAFC',
  white: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
  blue: '#2563EB',
  blueBg: '#EFF4FF',
  green: '#16A34A',
  greenBg: '#F0FDF4',
  red: '#DC2626',
  redBg: '#FEF2F2',
  orange: '#EA580C',
  orangeBg: '#FFF7ED',
}

// ── Cabeçalho de página (título + ícone pequeno + descrição) ───────────────
export function PageHeader({ icon, title, description, badges = [] }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: description ? 4 : 0 }}>
        {icon && <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>}
        <span style={{ fontSize: 22, fontWeight: 700, color: DS.text }}>{title}</span>
      </div>
      {description && (
        <div style={{ fontSize: 13, color: DS.muted, marginTop: 2 }}>{description}</div>
      )}
      {badges.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
          {badges.map((b, i) => (
            <span key={i} style={{ background: DS.bg, border: `1px solid ${DS.border}`, color: DS.muted, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
              {b}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Card de KPI neutro (mesmo estilo em toda a plataforma) ──────────────────
export function KpiCard({ value, label, tone = 'neutral' }) {
  const cor = tone === 'positive' ? DS.green : tone === 'negative' ? DS.red : tone === 'accent' ? DS.blue : DS.text
  return (
    <div style={{ background: DS.white, borderRadius: 10, padding: '14px 16px', border: `1px solid ${DS.border}`, textAlign: 'center' }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: cor }}>{value}</div>
      <div style={{ fontSize: 11, color: DS.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ── Bloco de destaque de valor (ex: "Potencial de recuperação") ────────────
export function ValorDestaque({ label, valor, tone = 'positive' }) {
  const cor = tone === 'positive' ? DS.green : tone === 'negative' ? DS.red : DS.blue
  return (
    <div style={{ background: DS.white, border: `1px solid ${DS.border}`, borderRadius: 12, padding: '18px 22px', marginBottom: 20, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: DS.muted, marginBottom: 4, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: cor }}>{valor}</div>
    </div>
  )
}

// ── Card de conteúdo padrão (substitui os cards coloridos por tese) ─────────
export function ContentCard({ title, icon, children, style }) {
  return (
    <div style={{ background: DS.white, borderRadius: 12, border: `1px solid ${DS.border}`, padding: '16px 20px', marginBottom: 16, ...style }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: DS.text, marginBottom: 12 }}>
          {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Lista de documentos necessários (estado "sem dados ainda") ─────────────
export function ListaDocumentos({ itens }) {
  return (
    <div style={{ background: DS.bg, borderRadius: 10, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: DS.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Documentos necessários
      </div>
      {itens.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: DS.text, marginBottom: 4 }}>
          <span style={{ color: DS.blue, fontWeight: 700 }}>•</span> {d}
        </div>
      ))}
    </div>
  )
}

// ── Botão primário padrão (sempre azul, em toda a plataforma) ──────────────
export function BtnPrimario({ children, onClick, disabled, fullWidth = true, style }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '10px 18px',
        background: disabled ? DS.border : DS.blue,
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}>
      {children}
    </button>
  )
}

// ── Botão secundário padrão ──────────────────────────────────────────────────
export function BtnSecundario({ children, onClick, fullWidth = true, style }) {
  return (
    <button onClick={onClick}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '10px 18px',
        background: '#fff',
        color: DS.muted,
        border: `1.5px solid ${DS.border}`,
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        ...style,
      }}>
      {children}
    </button>
  )
}

// ── TEMPLATE ÚNICO DE FUNCIONALIDADE/TESE ───────────────────────────────────
// icon: emoji pequeno — a ÚNICA diferenciação visual permitida entre teses
// title, description: texto da tese
// emptyState: { documentos: [...], onAcaoPrincipal, textoAcaoPrincipal }
// hasData: boolean — se true, renderiza children (o conteúdo específico da tese)
export default function FunctionalPageTemplate({
  icon,
  title,
  description,
  badges = [],
  hasData,
  emptyState,
  children,
  maxWidth = 1100,
}) {
  return (
    <div style={{ maxWidth, margin: '0 auto', paddingBottom: 60 }}>
      <PageHeader icon={icon} title={title} description={description} badges={badges} />

      {!hasData && emptyState ? (
        <div style={{ background: DS.white, borderRadius: 12, border: `1px solid ${DS.border}`, padding: '40px 32px', textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.7 }}>{icon}</div>
          <div style={{ fontSize: 15, color: DS.muted, lineHeight: 1.7, marginBottom: 6 }}>{description}</div>
          {emptyState.instrucao && (
            <div style={{ fontSize: 13, color: DS.muted, marginBottom: 22 }}>{emptyState.instrucao}</div>
          )}
          {emptyState.documentos && <ListaDocumentos itens={emptyState.documentos} />}
          {emptyState.onAcaoPrincipal && (
            <BtnPrimario onClick={emptyState.onAcaoPrincipal} style={{ marginBottom: 10 }}>
              {emptyState.textoAcaoPrincipal || 'Importar arquivos'}
            </BtnPrimario>
          )}
          {emptyState.onVoltar && (
            <BtnSecundario onClick={emptyState.onVoltar}>← Voltar</BtnSecundario>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  )
}