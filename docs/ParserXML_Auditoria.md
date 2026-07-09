# ParserXML_Auditoria.md — FiscalTrib
**Versão:** 1.1  
**Data:** 2026-07-08  
**Arquivo auditado:** `src/components/CentralImportacoes.jsx`  
**Função auditada:** `parseXMLNFe()`

---

## 1. Campos extraídos do XML de NF-e

### Cabeçalho da nota

| Campo | Tag XML | Tipo | Status |
|---|---|---|---|
| Competência (AAAA-MM) | `dhEmi` / `dEmi` | texto | ✅ extraído |
| Tipo da nota (entrada/saída) | `tpNF` | texto (0/1) | ✅ extraído v1.1 |
| Chave de acesso | `chNFe` | texto (44 dígitos) | ✅ extraído v1.1 |
| Número da nota | `nNF` | texto | ✅ extraído v1.1 |
| Série | `serie` | texto | ✅ extraído v1.1 |
| Natureza da operação | `natOp` | texto | ✅ extraído |
| CNPJ emitente | `CNPJ` | texto | ✅ extraído |
| Valor total da NF-e | `vNF` | decimal | ✅ extraído |
| ICMS total | `vICMS` | decimal | ✅ extraído |
| PIS total | `vPIS` | decimal | ✅ extraído |
| COFINS total | `vCOFINS` | decimal | ✅ extraído |
| ISS/ISSQN total | `vISS` / `vISSQN` | decimal | ✅ extraído |
| ICMS-ST total | `vST` | decimal | ✅ extraído |
| Frete total | `vFrete` | decimal | ✅ extraído v1.1 |
| Desconto total | `vDesc` | decimal | ✅ extraído v1.1 |
| IPI total | `vIPI` | decimal | ✅ extraído v1.1 |

### Por item (`det`)

| Campo | Tag XML | Tipo | Status |
|---|---|---|---|
| NCM | `NCM` | texto | ✅ extraído |
| CFOP | `CFOP` | texto | ✅ extraído |
| CST ou CSOSN | `CST` / `CSOSN` | texto | ✅ extraído |
| CEST | `CEST` | texto | ✅ extraído v1.1 |
| Código interno do produto | `cProd` | texto | ✅ extraído v1.1 |
| Descrição do produto | `xProd` | texto | ✅ extraído |
| Origem da mercadoria | `orig` | texto (0=nacional) | ✅ extraído v1.1 |
| Quantidade | `qCom` | decimal | ✅ extraído v1.1 |
| Valor unitário | `vUnCom` | decimal | ✅ extraído v1.1 |
| Valor total do item | `vProd` | decimal | ✅ extraído |
| Desconto do item | `vDesc` | decimal | ✅ extraído v1.1 |
| Base de cálculo ICMS | `vBC` | decimal | ✅ extraído v1.1 |
| Alíquota ICMS | `pICMS` | decimal | ✅ extraído v1.1 |
| ICMS por item | `vICMS` | decimal | ✅ extraído |
| Base de cálculo ST | `vBCST` | decimal | ✅ extraído v1.1 |
| Alíquota ST | `pICMSST` | decimal | ✅ extraído v1.1 |
| ICMS-ST por item | `vICMSST` / `vST` | decimal | ✅ extraído |
| IPI por item | `vIPI` | decimal | ✅ extraído v1.1 |
| Base de cálculo PIS | `vBCPIS` | decimal | ✅ extraído v1.1 |
| Alíquota PIS | `pPIS` | decimal | ✅ extraído |
| PIS por item | `vPIS` | decimal | ✅ extraído |
| Base de cálculo COFINS | `vBCCOFINS` | decimal | ✅ extraído v1.1 |
| Alíquota COFINS | `pCOFINS` | decimal | ✅ extraído |
| COFINS por item | `vCOFINS` | decimal | ✅ extraído |

---

## 2. Estrutura do objeto retornado

```js
{
  // Identificação
  chNFe: "35240112345678000195550010000012341234567890",
  nNF: "1234",
  serie: "1",
  tpNF: "1",          // "0"=entrada, "1"=saída — CRÍTICO para todos os motores
  competencia: "2024-03",
  cnpjEmi: "12345678000195",
  natOp: "Venda de mercadorias",

  // Totais
  vNF: 15000.00,
  vICMS: 1200.00,
  vPIS: 247.50,
  vCOFINS: 1140.00,
  vISS: 0,
  vST: 350.00,
  vFrete: 120.00,
  vDesc: 0,
  vIPI: 0,

  // Validação
  valido: true,

  // Itens
  itens: [
    {
      ncm: "30049099",
      cfop: "5102",
      cst: "07",
      cest: "1300100",
      cProd: "PROD001",
      xProd: "Medicamento X",
      orig: "0",
      qCom: 100,
      vUnCom: 5.00,
      vProd: 500.00,
      vDesc: 0,
      vBC: 500.00,
      pICMS: 12.00,
      vItemICMS: 60.00,
      vBCST: 0,
      pICMSST: 0,
      vItemST: 0,
      vItemIPI: 0,
      vBCPIS: 500.00,
      pPIS: 0,
      vItemPIS: 0,
      vBCCOFINS: 500.00,
      pCOFINS: 0,
      vItemCOFINS: 0,
    }
  ]
}
```

---

## 3. Campos ainda não extraídos

| Campo | Tag XML | Necessário para |
|---|---|---|
| CNPJ destinatário | `dest/CNPJ` | Identificar quem recebe a nota |
| UF emitente | `emit/UF` | ICMS interestadual, Difal |
| UF destinatário | `dest/UF` | ICMS interestadual, Difal |
| Data de entrada | `dhSaiEnt` | Distinguir data de emissão de entrada |
| Indicador IE destinatário | `indIEDest` | Operações interestaduais |
| GTIN/EAN | `cEAN` | Identificação de produto monofásico por GTIN |
| Modalidade BC ICMS | `modBC` | Tipo de tributação ICMS |
| Informações adicionais | `infCpl` | Dados complementares da nota |

---

## 4. O que o motor de oportunidades detecta (v1.1)

| Tese | Confiabilidade | Base de dados |
|---|---|---|
| Receitas Monofásicas | ✅ boa | NCM + vItemPIS + vItemCOFINS + tpNF |
| ICMS-ST Simples/LP | ✅ boa | CST + vItemST + CEST + tpNF |
| Segregação de Receitas | 🟡 estimativa | CFOP de serviço vs mercadoria |
| Fator R | 🟡 estimativa | CFOP de serviço (sem dados de folha) |
| PIS/COFINS alíquota incorreta | ✅ boa | pPIS + pCOFINS + vBCPIS + vBCCOFINS |

---

## 5. Próximos campos a adicionar (backlog)

| Prioridade | Campo | Módulo que desbloqueia |
|---|---|---|
| Alta | `dest/CNPJ` e `dest/UF` | Operações interestaduais, Difal |
| Alta | `emit/UF` | ICMS interestadual |
| Média | `cEAN` (GTIN) | Monofásicos por GTIN além de NCM |
| Média | `infCpl` | Dados complementares para análise textual |
| Baixa | `modBC` | Modalidade de tributação ICMS |
| Baixa | `dhSaiEnt` | Data de entrada vs emissão |

---

## 6. Histórico de versões

| Versão | Data | Alterações |
|---|---|---|
| 1.0 | 2026-07-08 | Auditoria inicial — mapeamento do parser existente |
| 1.1 | 2026-07-08 | Expansão: tpNF, chNFe, nNF, serie, vFrete, vDesc, vIPI no cabeçalho; CEST, cProd, orig, qCom, vUnCom, vDesc, vBC, pICMS, vBCST, pICMSST, vItemIPI, vBCPIS, vBCCOFINS nos itens |