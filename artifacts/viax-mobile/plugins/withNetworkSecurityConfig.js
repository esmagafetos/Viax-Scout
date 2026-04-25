/**
 * Expo config plugin: withNetworkSecurityConfig
 *
 * Garante que o APK Android permita tráfego HTTP em texto puro (cleartext)
 * para QUALQUER domínio — incluindo IPs literais como 127.0.0.1 e 10.0.2.2.
 *
 * Por quê: a partir do Android 9 (API 28), o sistema bloqueia HTTP por padrão.
 * Mesmo com `android:usesCleartextTraffic="true"` no manifesto, o React Native
 * (OkHttp) em builds release com targetSdkVersion >= 28 aplica restrições
 * adicionais a IPs literais. A solução robusta é fornecer um
 * `res/xml/network_security_config.xml` explícito e referenciá-lo no
 * `<application>` do AndroidManifest.
 *
 * Após qualquer alteração nesse arquivo é OBRIGATÓRIO reconstruir o APK
 * (`eas build --platform android --profile preview`) — a configuração faz
 * parte do bundle e não pode ser corrigida apenas no servidor.
 */

const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">127.0.0.1</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
  </domain-config>
</network-security-config>
`;

function getMainApplication(androidManifest) {
  const manifest = androidManifest.manifest;
  if (!manifest || !manifest.application || !manifest.application.length) {
    throw new Error("AndroidManifest.xml: <application> não encontrado.");
  }
  return manifest.application.find(
    (app) => app.$ && app.$["android:name"] === ".MainApplication"
  ) || manifest.application[0];
}

const withNetworkSecurityConfig = (config) => {
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "network_security_config.xml"),
        NETWORK_SECURITY_CONFIG_XML,
        "utf8"
      );
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const app = getMainApplication(cfg.modResults);
    app.$ = app.$ || {};
    app.$["android:networkSecurityConfig"] = "@xml/network_security_config";
    app.$["android:usesCleartextTraffic"] = "true";
    return cfg;
  });

  return config;
};

module.exports = withNetworkSecurityConfig;
