# MK Rewind + AdBlock — v4.3 (beta)

Extensão experimental para Google Chrome que adiciona uma barra de retrocesso na Twitch, com botão **AO VIVO** e bloqueio opcional de anúncios.

> **Avisos:** Não é um projeto oficial da Twitch. Não existe garantia de remoção de todos os anúncios. O retrocesso depende da disponibilidade da gravação da live na Twitch. A integração com VAFT não foi validada em todas as transmissões.

## Funções

- Barra de retrocesso integrada na página da Twitch e retorno ao vivo.
- Opção de ligar/desligar o bloqueio de anúncios pelo popup.
- Filtros para anúncios visuais e de rede.
- Bloqueio experimental de comerciais inseridos no vídeo usando o [TwitchAdSolutions / VAFT](https://github.com/ryanbr/TwitchAdSolutions), instalado opcionalmente e com verificação de integridade.

## Instalação no Chrome

1. Baixe o ZIP deste repositório e extraia para uma pasta local (não instale a extensão diretamente de dentro do ZIP).
2. Abra `chrome://extensions`, habilite **Modo do desenvolvedor** e selecione **Carregar sem compactação**.
3. Escolha a pasta extraída que contém o `manifest.json`.
4. Abra uma live na Twitch e atualize com `Ctrl + R`.
5. Para alternar o AdBlock, abra o popup da extensão e recarregue a página.

### Ativação opcional do VAFT

O arquivo `adblock_video.js` contido no pacote é o **modo básico**. Para incluir o código do VAFT, confira primeiro o script `preparar-vaft.ps1` e execute `ATIVAR-VAFT.cmd` **sem privilégios de administrador**, se o Windows permitir. Esse procedimento faz o download de uma versão *fixa* do VAFT e a valida comparando seu hash Git SHA-1 com o hash declarado antes de substituir o arquivo.

Depois de ativar, clique em **Recarregar** na página `chrome://extensions` e recarregue a Twitch. O popup deve indicar **Modo VAFT: bloqueio de vídeo**.

**Não desative o Smart App Control ou o antivírus para executar os scripts.** Se o Windows bloquear o `.cmd`, a extensão pode continuar funcionando no modo básico. O modo VAFT também pode causar interrupções ou redução temporária da qualidade.

## Origem do VAFT e créditos

- Projeto original: https://github.com/ryanbr/TwitchAdSolutions
- Commit usado: `e4dfb26755cb440f9ec6a2430a9b131fa1de062a`
- Blob SHA-1 esperado: `c80fb54fb3bedc72d0b2d0cf8ad3e90607fa6744`
- Licença do VAFT: MIT (ver `LICENSE-VAFT.txt`).

Este repositório não redistribui o arquivo completo do VAFT por padrão; a preparação manual é opt-in. A interface da extensão e a integração com a Twitch são experimentais. A instalação via modo desenvolvedor requer cuidado com código de terceiros.

## Estrutura

- `manifest.json` — Manifest V3 do Chrome.
- `rewind.js` e `rewind.css` — barra de retrocesso e controles na Twitch.
- `adblock_video.js` — modo básico, substituído localmente ao preparar o VAFT.
- `background.js` — ativa/desativa script de anúncios de vídeo.
- `adblock_cosmetic.js` e `rules/ads.json` — filtros cosméticos e de rede.
- `popup.html` e `popup.js` — controle de AdBlock.
- `preparar-vaft.ps1` e `ATIVAR-VAFT.cmd` — preparação opcional.

## Limitações

- Retroceder até o início da transmissão só funciona se o trecho estiver acessível via gravação da Twitch.
- O sistema de anúncios da Twitch pode mudar e impedir alguns métodos de bloqueio.
- Não é um produto oficial da Twitch nem do Google.