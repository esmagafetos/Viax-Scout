const USER_AGENT = "ViaX-Scout/7.0 (viax-scout-br)";
const NOMINATIM_INSTANCES = [
  "https://nominatim.openstreetmap.org",
  "https://nominatim.geocoding.ai",
];
const SIMILARITY_THRESHOLD = 0.68;

export interface GeoResult {
  rua: string;
  lat?: number;
  lon?: number;
}

export interface ParsedAddress {
  rua_principal: string;
  numero: string;
  km_rodovia: number | null;
  via_secundaria: string | null;
  poi: string;
  cidade: string;
  bairro: string;
  cep: string | null;
}

export interface NuanceResult {
  is_nuance: boolean;
  similaridade: number | null;
  motivo: string;
}

export interface AddressRow {
  linha: number;
  endereco: string;
  lat: number | null;
  lon: number | null;
  cidade: string;
  bairro: string;
}

export interface ResultRow {
  linha: number;
  endereco_original: string;
  nome_rua_extraido: string | null;
  nome_rua_oficial: string | null;
  similaridade: number | null;
  is_nuance: boolean;
  motivo: string;
  poi_estruturado: string | null;
}

function normalizarTexto(texto: string): string {
  texto = texto.toLowerCase();
  texto = texto.replace(/[^\p{L}\p{N}\s]/gu, "");
  texto = texto.replace(/\s+/g, " ").trim();
  const mapa: Record<string, string> = {
    à: "a", á: "a", â: "a", ã: "a", ä: "a",
    è: "e", é: "e", ê: "e", ë: "e",
    ì: "i", í: "i", î: "i", ï: "i",
    ò: "o", ó: "o", ô: "o", õ: "o", ö: "o",
    ù: "u", ú: "u", û: "u", ü: "u",
    ç: "c", ñ: "n",
  };
  return texto.split("").map((c) => mapa[c] ?? c).join("");
}

function calcularSimilaridade(str1: string, str2: string): number {
  const a = normalizarTexto(str1);
  const b = normalizarTexto(str2);
  if (!a || !b) return 0;
  let common = 0;
  const aArr = a.split("");
  const bArr = [...b.split("")];
  for (const ch of aArr) {
    const idx = bArr.indexOf(ch);
    if (idx !== -1) {
      common++;
      bArr.splice(idx, 1);
    }
  }
  return (2 * common) / (a.length + b.length);
}

function limiarAdaptativo(extraida: string): number {
  const len = extraida.length;
  if (len < 5) return 0.85;
  if (len < 10) return 0.75;
  return 0.68;
}

function extrairCEP(texto: string): string | null {
  const m = texto.match(/\b(\d{5}-?\d{3})\b/);
  if (m) return m[1].replace(/[^0-9]/g, "");
  return null;
}

function extrairNumero(endereco: string): string {
  const m = endereco.match(/[,\s]+(\d+[A-Za-z]?|s\/?n|sn)\b/i);
  if (m) return m[1].toUpperCase();
  return "";
}

function extrairKmRodovia(endereco: string): number | null {
  const m = endereco.match(/\bkm\s*(\d+(?:[.,]\d+)?)/i);
  if (m) return parseFloat(m[1].replace(",", "."));
  return null;
}

function removerAnotacoesMotorista(s: string): string {
  const idx = s.indexOf(" - ");
  if (idx !== -1) s = s.substring(0, idx);
  s = s.replace(/\s+\d+[°ªº].*$/u, "");
  const gatilhos = ["proximo", "próximo", "perto", "referencia", "maps", "google",
    "waze", "placas", "portao", "buzina", "frente", "fundos", "esquina", "atrás"];
  const lower = s.toLowerCase();
  for (const g of gatilhos) {
    const pos = lower.indexOf(g);
    if (pos !== -1 && pos > 5) {
      s = s.substring(0, pos).trim();
      break;
    }
  }
  return s;
}

function extrairLogradouroPrincipal(endereco: string): string {
  endereco = endereco.replace(/^\s*(Loteamento|Condomínio|Residencial|Conjunto|Núcleo)\s+[^,]+?[,]?\s*/i, "");
  const m = endereco.match(/\b(?:Rua|Av\.?|Avenida|Alameda|Praça|Pça\.?|Travessa|Tv\.?|Estrada|Rod\.?|Rodovia|Viela|Beco|Passagem|Largo)\s+[^\s,.\d][^,.\d]*/iu);
  if (m) return m[0].trim();
  const m2 = endereco.match(/^([^,\d]+)/);
  if (m2) {
    const candidato = m2[1].trim();
    if (candidato.length >= 4 && !/^(lote|quadra|qd|lt|casa|apto|apartamento|bloco|conjunto|residencial|condomínio|nº)$/i.test(candidato)) {
      return candidato;
    }
  }
  return "";
}

function extrairViaSecundaria(endereco: string): string | null {
  const m = endereco.match(/,\s*(travessa|trav\.?|tv\.?|passagem|psg\.?|viela|beco)\s*\.?\s*\d*[^,]*/i);
  if (m && m[0].length > 3) return m[0].trim();
  return null;
}

function extrairPOI(endereco: string): string {
  let sem = endereco.replace(/^\s*(?:Rua|Av\.?|Avenida|Alameda|Praça|Pça\.?|Travessa|Tv\.?|Estrada|Rod\.?|Rodovia|Viela|Beco|Passagem|Largo)\s+[^,]+/iu, "");
  sem = sem.replace(/^[,\s]+\d*[,\s]*/u, "");
  sem = sem.replace(/^\s*(loja|apt\.?|apto\.?)\s+/iu, "");
  sem = sem.replace(/\b(travessa|trav\.?|tv\.?|passagem)\s*\.?\s*\d*[A-Za-z]*/iu, "");
  sem = sem.replace(/^[\s\t\n\r,()]+|[\s\t\n\r,()]+$/g, "");
  if (sem.length >= 3 && !/^\d+$/.test(sem) && !/^[A-Z]\d*$/i.test(sem)) return sem;
  return "";
}

function extrairCidadeDoEndereco(endereco: string): string {
  const m = endereco.match(/[,]\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)\s*[,]?\s*[A-Z]{2}\b/);
  if (m) return m[1].trim();
  return "";
}

function normalizarAcronimos(texto: string): string {
  texto = texto.replace(/\b(Lot|LT|L)[\s:]*(\d+[A-Z]?)\b/gi, "Lote $2");
  texto = texto.replace(/\b(Qua?|QD|Quad)[\s:]*(\d+)\b/gi, "Quadra $2");
  texto = texto.replace(/\b(Cs\.?|C)[\s:]*(\d+[A-Z]?)\b/gi, "Casa $2");
  texto = texto.replace(/\b(Lj\.?|Lj)[\s:]*(\d+[A-Z]?)\b/gi, "Loja $2");
  texto = texto.replace(/\b(Bl\.?|BL)\s+([A-Z])\b/gi, "Bloco $2");
  texto = texto.replace(/\b(Apt\.?|Apto\.?)\s+(\d+[A-Z]?)\b/gi, "Apto. $2");
  return texto;
}

function extrairRefsEstruturadas(texto: string): string | null {
  const refs: string[] = [];
  if (/Quadra\s+(\d+)/i.test(texto)) refs.push("Quadra " + texto.match(/Quadra\s+(\d+)/i)![1]);
  if (/Lote\s+([A-Z0-9]+)/i.test(texto)) refs.push("Lote " + texto.match(/Lote\s+([A-Z0-9]+)/i)![1]);
  if (/Casa\s+(\d+[A-Z]?)/i.test(texto)) refs.push("Casa " + texto.match(/Casa\s+(\d+[A-Z]?)/i)![1]);
  if (/Bloco\s+([A-Z]+)/i.test(texto)) refs.push("Bloco " + texto.match(/Bloco\s+([A-Z]+)/i)![1]);
  return refs.length > 0 ? refs.join(", ") : null;
}

export function parsearEndereco(endereco: string, cidade = "", bairro = ""): ParsedAddress {
  let end = endereco.replace(/\s+/g, " ").trim();
  end = removerAnotacoesMotorista(end);
  end = normalizarAcronimos(end);
  return {
    rua_principal: extrairLogradouroPrincipal(end),
    numero: extrairNumero(end),
    km_rodovia: extrairKmRodovia(end),
    via_secundaria: extrairViaSecundaria(end),
    poi: extrairPOI(end),
    poi_estruturado: extrairRefsEstruturadas(end),
    cidade: cidade || extrairCidadeDoEndereco(end),
    bairro,
    cep: extrairCEP(end),
  } as any;
}

async function httpGet(url: string): Promise<any> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

async function aguardarRateLimit(ultimaReq: number): Promise<number> {
  const agora = Date.now();
  const diff = agora - ultimaReq;
  if (diff < 1100) await new Promise((r) => setTimeout(r, 1100 - diff));
  return Date.now();
}

function extrairDadosNominatim(data: any): GeoResult | null {
  const addr = data?.address ?? {};
  const campos = ["road", "pedestrian", "footway", "cycleway", "path", "street", "residential"];
  for (const c of campos) {
    if (addr[c]) {
      return {
        rua: String(addr[c]).trim(),
        lat: data.lat ? parseFloat(data.lat) : undefined,
        lon: data.lon ? parseFloat(data.lon) : undefined,
      };
    }
  }
  return null;
}

function haversineMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dO = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dL / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dO / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function geocodeBrasilAPI(cep: string): Promise<{ rua: string; cidade: string; bairro: string } | null> {
  const limpo = cep.replace(/\D/g, "");
  if (limpo.length !== 8) return null;
  const data = await httpGet(`https://brasilapi.com.br/api/cep/v1/${limpo}`);
  if (!data?.street) return null;
  return {
    rua: data.street.replace(/\b\w/g, (c: string) => c.toUpperCase()),
    cidade: data.city ?? "",
    bairro: data.neighborhood ?? "",
  };
}

export async function geocodeForwardNominatim(query: string, ultimaReq: number): Promise<{ result: GeoResult | null; ultimaReq: number }> {
  let newUltimaReq = ultimaReq;
  const viewbox = "-74.0,-34.8,-34.8,5.3";
  for (const base of NOMINATIM_INSTANCES) {
    newUltimaReq = await aguardarRateLimit(newUltimaReq);
    const url = `${base}/search?format=json&q=${encodeURIComponent(query)}&limit=3&addressdetails=1&viewbox=${viewbox}&bounded=1`;
    const data = await httpGet(url);
    if (!data || !Array.isArray(data)) continue;
    for (const item of data) {
      const result = extrairDadosNominatim(item);
      if (result && result.rua.length > 4) return { result, ultimaReq: newUltimaReq };
    }
  }
  const photon = await httpGet(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
  if (photon?.features?.[0]) {
    const f = photon.features[0];
    const rua = f.properties?.street ?? f.properties?.name;
    if (rua) return {
      result: { rua, lat: f.geometry?.coordinates?.[1], lon: f.geometry?.coordinates?.[0] },
      ultimaReq: newUltimaReq,
    };
  }
  return { result: null, ultimaReq: newUltimaReq };
}

export async function geocodeReverseNominatim(lat: number, lon: number, ultimaReq: number): Promise<{ result: GeoResult | null; ultimaReq: number }> {
  const newUltimaReq = await aguardarRateLimit(ultimaReq);
  const url = `${NOMINATIM_INSTANCES[0]}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=20&accept-language=pt-BR&layer=address`;
  const data = await httpGet(url);
  if (!data) return { result: null, ultimaReq: newUltimaReq };
  return { result: extrairDadosNominatim(data), ultimaReq: newUltimaReq };
}

export async function geocodeGoogleMaps(query: string, apiKey: string): Promise<GeoResult | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}&language=pt-BR&region=BR`;
  const data = await httpGet(url);
  if (data?.status !== "OK" || !data?.results?.[0]) return null;
  const result = data.results[0];
  const components = result.address_components ?? [];
  const routeComp = components.find((c: any) => c.types.includes("route"));
  if (!routeComp) return null;
  return {
    rua: routeComp.long_name,
    lat: result.geometry?.location?.lat,
    lon: result.geometry?.location?.lng,
  };
}

function montarQueryBusca(parsed: ParsedAddress): string {
  const partes: string[] = [];
  if (parsed.rua_principal) partes.push(parsed.rua_principal);
  const num = parsed.numero.toUpperCase();
  if (num && !["", "0", "SN", "S/N", "S-N"].includes(num)) partes.push(num);
  if (parsed.bairro) partes.push(parsed.bairro);
  if (parsed.cidade) partes.push(parsed.cidade);
  partes.push("Brasil");
  return [...new Set(partes)].join(", ");
}

export function verificarNuance(parsed: ParsedAddress, geoResult: GeoResult | null): NuanceResult {
  if (!geoResult) return { is_nuance: true, similaridade: null, motivo: "Endereço não encontrado no mapa." };
  const ruaOficial = geoResult.rua;
  if (!ruaOficial) return { is_nuance: true, similaridade: null, motivo: "Coordenadas localizadas, mas OSM não identificou via nomeada." };

  const ruaExtraida = parsed.rua_principal;
  const similaridade = calcularSimilaridade(ruaExtraida, ruaOficial);
  const limiar = limiarAdaptativo(ruaExtraida);

  if (similaridade < limiar) {
    return {
      is_nuance: true,
      similaridade: Math.round(similaridade * 1000) / 1000,
      motivo: `"${ruaExtraida}" difere do oficial "${ruaOficial}" (${Math.round(similaridade * 100)}%)`,
    };
  }
  return { is_nuance: false, similaridade: Math.round(similaridade * 1000) / 1000, motivo: "" };
}

export async function processarEndereco(
  item: AddressRow,
  instanceMode: string,
  googleMapsApiKey: string | null,
  ultimaReq: number,
  cache: Map<string, { data: GeoResult | null; ts: number }>
): Promise<{ resultado: ResultRow; ultimaReq: number }> {
  const parsed = parsearEndereco(item.endereco, item.cidade, item.bairro) as ParsedAddress & { poi_estruturado: string | null };
  const cep = parsed.cep;

  let geoResult: GeoResult | null = null;
  let newUltimaReq = ultimaReq;

  if (instanceMode === "googlemaps" && googleMapsApiKey) {
    const query = montarQueryBusca(parsed);
    geoResult = await geocodeGoogleMaps(query, googleMapsApiKey);
  } else {
    if (cep) {
      const brasilApiData = await geocodeBrasilAPI(cep);
      if (brasilApiData) {
        parsed.rua_principal = brasilApiData.rua;
        if (!parsed.cidade) parsed.cidade = brasilApiData.cidade;
        if (!parsed.bairro) parsed.bairro = brasilApiData.bairro;
      }
    }

    if (!geoResult && parsed.rua_principal) {
      const query = montarQueryBusca(parsed);
      const cacheKey = `fwd_${query}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 30 * 24 * 3600 * 1000) {
        geoResult = cached.data;
      } else {
        const fwd = await geocodeForwardNominatim(query, newUltimaReq);
        geoResult = fwd.result;
        newUltimaReq = fwd.ultimaReq;
        cache.set(cacheKey, { data: geoResult, ts: Date.now() });
      }
    }

    if (!geoResult && item.lat !== null && item.lon !== null) {
      const cacheKey = `rev_${Math.round(item.lat * 100000)}_${Math.round(item.lon * 100000)}`;
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 30 * 24 * 3600 * 1000) {
        geoResult = cached.data;
      } else {
        const rev = await geocodeReverseNominatim(item.lat, item.lon, newUltimaReq);
        geoResult = rev.result;
        newUltimaReq = rev.ultimaReq;
        cache.set(cacheKey, { data: geoResult, ts: Date.now() });
      }
    }
  }

  const verif = verificarNuance(parsed, geoResult);

  return {
    resultado: {
      linha: item.linha,
      endereco_original: item.endereco,
      nome_rua_extraido: parsed.rua_principal || null,
      nome_rua_oficial: geoResult?.rua ?? null,
      similaridade: verif.similaridade,
      is_nuance: verif.is_nuance,
      motivo: verif.motivo,
      poi_estruturado: (parsed as any).poi_estruturado ?? null,
    },
    ultimaReq: newUltimaReq,
  };
}
