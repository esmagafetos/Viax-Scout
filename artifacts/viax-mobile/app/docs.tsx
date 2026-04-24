import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import AppHeader from '../components/AppHeader';
import { Card } from '../components/ui/Card';
import { useColors } from '../lib/theme';

interface ContentSection {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  paragraphs?: { text: string; bold?: boolean }[][];
}

interface FaqSection {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  items: { q: string; a: string }[];
}

type Section = ContentSection | FaqSection;

const SECTIONS: Section[] = [
  {
    id: 'o-que-e',
    icon: 'information-circle-outline',
    title: 'O que é o ViaX:Trace?',
    paragraphs: [
      [
        { text: 'O ViaX:Trace é um sistema SaaS de auditoria de rotas logísticas. Ele valida planilhas de entrega (XLSX ou CSV) comparando os endereços declarados pelos motoristas com as coordenadas GPS capturadas durante a entrega.' },
      ],
      [
        { text: 'Quando há discrepância entre o endereço informado e a localização real do GPS, o sistema classifica o item como uma ' },
        { text: 'nuance', bold: true },
        { text: ' — que pode indicar erro de digitação, endereço incorreto ou potencial fraude.' },
      ],
    ],
  },
  {
    id: 'nuance',
    icon: 'warning-outline',
    title: 'O que é uma nuance?',
    paragraphs: [
      [
        { text: 'Uma ' },
        { text: 'nuance', bold: true },
        { text: ' é detectada quando a rua/logradouro informado no endereço de entrega não corresponde (ou tem baixa similaridade) à via real identificada pelas coordenadas GPS.' },
      ],
      [{ text: 'Exemplos de nuances:', bold: true }],
      [{ text: '• Endereço informa "Rua das Flores, 123" mas o GPS aponta para "Av. Brasil, 123"' }],
      [{ text: '• Divergência de nome de bairro ou complemento' }],
      [{ text: '• Endereço com erro de grafia que impede correspondência' }],
      [{ text: 'Exemplos que NÃO são nuance:', bold: true }],
      [{ text: '• "Rua Sinagoga, 49, Travessa B" → GPS na Travessa B (reconhecimento de via secundária)' }],
      [{ text: '• Variações de siglas como "Av." vs "Avenida" (normalização automática)' }],
    ],
  },
  {
    id: 'como-usar',
    icon: 'cloud-upload-outline',
    title: 'Como processar uma planilha',
    paragraphs: [
      [{ text: '1. Prepare o arquivo', bold: true }],
      [{ text: 'O arquivo deve ser XLSX ou CSV com pelo menos as colunas de endereço e coordenadas GPS (latitude e longitude).' }],
      [{ text: '2. Vá em "Processar Rota"', bold: true }],
      [{ text: 'No menu de navegação, toque em Processar e faça o upload do arquivo.' }],
      [{ text: '3. Aguarde o processamento', bold: true }],
      [{ text: 'O sistema processa cada endereço em tempo real via geocodificação multi-camada. O progresso é exibido em tempo real.' }],
      [{ text: '4. Revise os resultados', bold: true }],
      [{ text: 'Cada linha é classificada como OK (endereço confere) ou Nuance (discrepância detectada).' }],
    ],
  },
  {
    id: 'formato',
    icon: 'grid-outline',
    title: 'Formato do arquivo',
    paragraphs: [
      [{ text: 'O sistema aceita planilhas com as seguintes colunas (case-insensitive):' }],
      [{ text: 'Colunas obrigatórias:', bold: true }],
      [{ text: '• endereco / endereço / address — Endereço completo da entrega' }],
      [{ text: '• latitude / lat — Coordenada decimal (ex: -23.5505)' }],
      [{ text: '• longitude / lon / lng — Coordenada decimal (ex: -46.6333)' }],
      [{ text: 'Opcionais:', bold: true }],
      [{ text: '• cidade / city, bairro / neighborhood, cep' }],
    ],
  },
  {
    id: 'geocodificacao',
    icon: 'location-outline',
    title: 'Como funciona a geocodificação',
    paragraphs: [
      [{ text: 'O sistema usa uma estratégia de ' }, { text: 'geocodificação multi-camada', bold: true }, { text: ' para máxima precisão em endereços brasileiros:' }],
      [{ text: 'Camada 1 — Geocodificação reversa (GPS → Rua)', bold: true }],
      [{ text: '1. Photon — OSM Photon API (rápido, sem rate limit)' }],
      [{ text: '2. Overpass API — Consulta direta à geometria OSM (preciso)' }],
      [{ text: '3. Nominatim — Fallback com dados OSM completos' }],
      [{ text: 'Camada 2 — Geocodificação direta (Endereço → Coordenada)', bold: true }],
      [{ text: '4. BrasilAPI — Dados de CEP nacionais' }],
      [{ text: '5. Google Maps — Fallback premium para casos difíceis' }],
      [{ text: 'Normalização inteligente', bold: true }],
      [{ text: 'O sistema normaliza siglas, remove anotações de motoristas, identifica POIs e promove vias secundárias quando o GPS confirma que são a via real de entrega.' }],
    ],
  },
  {
    id: 'faq',
    icon: 'help-circle-outline',
    title: 'Perguntas frequentes',
    items: [
      {
        q: 'O sistema funciona para cidades pequenas do interior?',
        a: 'Sim. O sistema usa múltiplas fontes OSM com boa cobertura no Brasil. Para endereços muito rurais, a precisão pode ser menor e o sistema indicará confiança reduzida.',
      },
      {
        q: 'O que é o limiar de similaridade?',
        a: 'O sistema calcula um percentual de correspondência entre o nome da rua informada e o nome oficial obtido pelo GPS. O limiar padrão é 68% — abaixo disso, o item é marcado como nuance.',
      },
      {
        q: 'Por que "Rua Sinagoga, Travessa B" não é nuance?',
        a: "O sistema reconhece o padrão brasileiro 'Logradouro de referência, número, Via de entrega'. Quando o GPS confirma que a via de entrega é a rua real, o endereço é validado.",
      },
      {
        q: 'Quantos endereços posso processar de uma vez?',
        a: 'Não há limite técnico fixo, mas planilhas com mais de 500 endereços podem levar alguns minutos. O progresso é exibido em tempo real.',
      },
      {
        q: 'Os dados são armazenados com segurança?',
        a: 'Sim. Todo o processamento ocorre em servidor seguro. Apenas você tem acesso aos seus resultados.',
      },
    ],
  },
];

export default function DocsScreen() {
  const c = useColors();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <AppHeader />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <View style={{ marginBottom: 20 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 99,
              backgroundColor: c.accentDim,
              borderWidth: 1,
              borderColor: 'rgba(212,82,26,0.2)',
              alignSelf: 'flex-start',
              marginBottom: 8,
            }}
          >
            <Ionicons name="document-text-outline" size={11} color={c.accent} />
            <Text style={{ fontSize: 10, fontFamily: 'Poppins_700Bold', color: c.accent, letterSpacing: 0.6, textTransform: 'uppercase' }}>
              Documentação
            </Text>
          </View>
          <Text style={{ fontFamily: 'Poppins_700Bold', fontSize: 24, color: c.text, letterSpacing: -0.5 }}>
            Guia do ViaX:Trace
          </Text>
          <Text style={{ fontSize: 12, color: c.textFaint, marginTop: 4, lineHeight: 17 }}>
            Tudo que você precisa saber para auditar rotas logísticas com precisão e eficiência.
          </Text>
        </View>

        {SECTIONS.map((section, i) => (
          <Card key={section.id} animate delay={i * 60} style={{ marginBottom: 14 }}>
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: c.surface2,
              }}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: c.accentDim,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={section.icon} size={16} color={c.accent} />
              </View>
              <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Poppins_700Bold', color: c.text, letterSpacing: -0.2 }}>
                {section.title}
              </Text>
            </View>
            <View style={{ padding: 16 }}>
              {'items' in section ? (
                section.items.map((item, idx) => (
                  <FaqItem
                    key={idx}
                    q={item.q}
                    a={item.a}
                    isLast={idx === section.items.length - 1}
                  />
                ))
              ) : (
                <View style={{ gap: 10 }}>
                  {section.paragraphs?.map((para, idx) => (
                    <Text key={idx} style={{ fontSize: 13, color: c.textMuted, lineHeight: 22 }}>
                      {para.map((seg, sidx) => (
                        <Text
                          key={sidx}
                          style={{
                            fontFamily: seg.bold ? 'Poppins_700Bold' : 'Poppins_400Regular',
                            color: seg.bold ? c.text : c.textMuted,
                          }}
                        >
                          {seg.text}
                        </Text>
                      ))}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </Card>
        ))}

        {/* Quick nav */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            { href: '/(tabs)/process', label: 'Processar Rota', desc: 'Upload de planilha', icon: 'cloud-upload-outline' as const },
            { href: '/(tabs)/history', label: 'Histórico', desc: 'Análises anteriores', icon: 'time-outline' as const },
            { href: '/(tabs)/settings', label: 'Configurações', desc: 'Valor por rota, metas', icon: 'settings-outline' as const },
          ].map((item) => (
            <Pressable
              key={item.href}
              onPress={() => router.push(item.href as any)}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                padding: 14,
                backgroundColor: c.surface,
                borderColor: c.borderStrong,
                borderWidth: 1,
                borderRadius: 12,
                gap: 6,
              }}
            >
              <Ionicons name={item.icon} size={20} color={c.accent} />
              <Text style={{ fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text }}>{item.label}</Text>
              <Text style={{ fontSize: 11, color: c.textFaint }}>{item.desc}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function FaqItem({ q, a, isLast }: { q: string; a: string; isLast: boolean }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: isLast ? 0 : 1, borderBottomColor: c.border }}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <Text style={{ flex: 1, fontSize: 13, fontFamily: 'Poppins_600SemiBold', color: c.text, lineHeight: 18 }}>{q}</Text>
        <MotiView
          animate={{ rotate: open ? '45deg' : '0deg' }}
          transition={{ type: 'timing', duration: 180 }}
        >
          <Ionicons name="add" size={18} color={c.textFaint} />
        </MotiView>
      </Pressable>
      {open && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
          style={{ paddingBottom: 14 }}
        >
          <Text style={{ fontSize: 12.5, color: c.textMuted, lineHeight: 19 }}>{a}</Text>
        </MotiView>
      )}
    </View>
  );
}
