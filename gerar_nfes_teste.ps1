$p = "C:\fiscaltrib\nfes_teste"
@("cenario1_monofasicos","cenario2_icms_st","cenario3_sem_oportunidade","cenario4_mix") | ForEach-Object { New-Item -ItemType Directory -Force -Path "$p\$_" | Out-Null }

function NFe($n,$ncm,$xProd,$cfop,$cst,$vP,$vST=0) {
$ch = "3526050156215100010455002000000" + $n.ToString().PadLeft(9,'0') + "10"
$vI=[math]::Round($vP*0.12,2); $vPIS=[math]::Round($vP*0.0165,2); $vCOF=[math]::Round($vP*0.076,2); $vNF=[math]::Round($vP+$vST,2)
@"
<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
<infNFe versao="4.00" Id="NFe$ch">
<ide><cUF>35</cUF><cNF>00000001</cNF><natOp>VENDA</natOp><mod>55</mod><serie>1</serie><nNF>$n</nNF><dhEmi>2026-05-15T10:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>3550308</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>0</cDV><tpAmb>2</tpAmb><finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres><procEmi>0</procEmi><verProc>1.0</verProc></ide>
<emit><CNPJ>01562151000104</CNPJ><xNome>LUD INSTRUMENTOS CIRURGICOS LTDA</xNome><xFant>LUD</xFant><enderEmit><xLgr>RUA TESTE</xLgr><nro>100</nro><xBairro>CENTRO</xBairro><cMun>3550308</cMun><xMun>SAO PAULO</xMun><UF>SP</UF><CEP>01310100</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE>111111111111</IE><CRT>1</CRT></emit>
<dest><CNPJ>33908267000130</CNPJ><xNome>CLIENTE TESTE LTDA</xNome><enderDest><xLgr>AV PAULISTA</xLgr><nro>1000</nro><xBairro>BELA VISTA</xBairro><cMun>3550308</cMun><xMun>SAO PAULO</xMun><UF>SP</UF><CEP>01310100</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderDest><indIEDest>9</indIEDest></dest>
<det nItem="1"><prod><cProd>P001</cProd><cEAN>SEM GTIN</cEAN><xProd>$xProd</xProd><NCM>$ncm</NCM><CFOP>$cfop</CFOP><uCom>UN</uCom><qCom>10.0000</qCom><vUnCom>$([math]::Round($vP/10,2))</vUnCom><vProd>$vP</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>10.0000</qTrib><vUnTrib>$([math]::Round($vP/10,2))</vUnTrib><indTot>1</indTot></prod><imposto><ICMS><ICMS00><orig>0</orig><CST>$cst</CST><modBC>3</modBC><vBC>$vP</vBC><pICMS>12.00</pICMS><vICMS>$vI</vICMS></ICMS00></ICMS><PIS><PISAliq><CST>01</CST><vBC>$vP</vBC><pPIS>1.65</pPIS><vPIS>$vPIS</vPIS></PISAliq></PIS><COFINS><COFINSAliq><CST>01</CST><vBC>$vP</vBC><pCOFINS>7.60</pCOFINS><vCOFINS>$vCOF</vCOFINS></COFINSAliq></COFINS></imposto></det>
<total><ICMSTot><vBC>$vP</vBC><vICMS>$vI</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>$vST</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>$vP</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>$vPIS</vPIS><vCOFINS>$vCOF</vCOFINS><vOutro>0.00</vOutro><vNF>$vNF</vNF></ICMSTot></total>
<transp><modFrete>9</modFrete></transp>
<pag><detPag><tPag>01</tPag><vPag>$vNF</vPag></detPag></pag>
</infNFe></NFe>
<protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><verAplic>SP_NFE_PL009_V4</verAplic><chNFe>$ch</chNFe><dhRecbto>2026-05-15T10:00:00-03:00</dhRecbto><nProt>135260000000001</nProt><digVal>AAAA=</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe>
</nfeProc>
"@
}

$mono = @("30049099","30041090","33030010","33041000","27101259")
$monoProd = @("MEDICAMENTO A","ANTIBIOTICO B","PERFUME C","BATOM D","GASOLINA E")
$norm = @("84713012","85171231","94036000","84433219","39269090")
$normProd = @("NOTEBOOK","SMARTPHONE","CADEIRA","IMPRESSORA","PLASTICO")

# Cenario 1 - Monofasicos com PIS/COFINS indevido
for ($i=1;$i -le 20;$i++) {
  $v = [math]::Round((Get-Random -Min 500 -Max 5000),2)
  $idx = ($i-1)%5
  NFe (1000+$i) $mono[$idx] $monoProd[$idx] "5102" "00" $v | Out-File "$p\cenario1_monofasicos\NFe_mono_$i.xml" -Encoding utf8
}

# Cenario 2 - ICMS-ST
for ($i=1;$i -le 20;$i++) {
  $v = [math]::Round((Get-Random -Min 1000 -Max 8000),2)
  $st = [math]::Round($v*0.40*0.12,2)
  $idx = ($i-1)%5
  NFe (2000+$i) $norm[$idx] "$($normProd[$idx]) ST" "5403" "10" $v $st | Out-File "$p\cenario2_icms_st\NFe_st_$i.xml" -Encoding utf8
}

# Cenario 3 - Sem oportunidades
for ($i=1;$i -le 20;$i++) {
  $v = [math]::Round((Get-Random -Min 500 -Max 3000),2)
  $idx = ($i-1)%5
  NFe (3000+$i) $norm[$idx] $normProd[$idx] "5102" "00" $v | Out-File "$p\cenario3_sem_oportunidade\NFe_normal_$i.xml" -Encoding utf8
}

# Cenario 4 - Mix
for ($i=1;$i -le 20;$i++) {
  $v = [math]::Round((Get-Random -Min 500 -Max 3000),2)
  $st = [math]::Round($v*0.40*0.12,2)
  $idx = ($i-1)%5
  NFe (4000+$i) $mono[$idx] $monoProd[$idx] "5102" "00" $v $st | Out-File "$p\cenario4_mix\NFe_mix_$i.xml" -Encoding utf8
}

Write-Host "80 NF-es geradas em $p" -ForegroundColor Green