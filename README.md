# 🐳 draw.io com componentes próprios

draw.io rodando no seu navegador, já com os **plugins** e as **bibliotecas de componentes** desta pasta.

## 📁 Estrutura

```
Template/
├── docker-compose.yml
├── drawio/
│   ├── Dockerfile
│   ├── start.sh          # carrega plugins e bibliotecas ao iniciar
│   ├── config.json       # configuração do editor
│   └── libraries/        # 🧩 bibliotecas de componentes (.xml)
└── plugins/
    ├── Codeblock/        # 🔌 cada pasta = um plugin
    └── Markdown/
```

## 🚀 Subir

```bash
docker compose up -d --build
```

Abra **http://localhost:9293** 🎉

| Comando | Para quê |
|---|---|
| `docker compose up -d --build` | Gerar a imagem e subir |
| `docker compose restart` | Recarregar plugins e bibliotecas editados |
| `docker compose down` | Parar |
| `docker compose logs -f` | Ver logs |

> 💡 Para usar outra porta: `DRAWIO_PORT=9000 docker compose up -d`

## ✏️ Usar

| Ação | Como |
|---|---|
| 📂 Abrir arquivo | **Arquivo → Abrir de → Dispositivo** |
| 💾 Salvar | `Cmd+S` / `Ctrl+S` → **Dispositivo** |
| 🎬 Apresentar | **Arquivo → Publicar → Modo de apresentação** |
| 🧩 Componentes | Barra lateral → **Componentes de exemplo** (e outras bibliotecas que você adicionar) |
| 💻 Bloco de código | Barra lateral → **Bloco de código**, ou `Cmd+Shift+K` / `Ctrl+Shift+K` |
| 📝 Markdown | Barra lateral → **Markdown**, ou `Cmd+Shift+X` / `Ctrl+Shift+X` |

> 💡 No **Chrome** e no **Edge**, o draw.io salva direto no arquivo aberto. No Firefox e no Safari, cada salvamento vira um download.

## 🧩 Adicionar componentes próprios

1. No draw.io: **Arquivo → Nova biblioteca**
2. Arraste as formas para a biblioteca e clique em **Salvar → Dispositivo**
3. Coloque o `.xml` em `drawio/libraries/` (o nome do arquivo vira o título na barra lateral)
4. `docker compose restart`

## 🔌 Adicionar plugins

1. Crie `plugins/<NomeDoPlugin>/` com o arquivo `.js` do plugin na raiz da pasta
2. `docker compose restart`

> Arquivos em subpastas (como `plugins/Codeblock/source/`) não são carregados.

## 📤 Compartilhar com outros devs

### Opção 1: Registry (recomendado)

```bash
# Gera para Mac (Apple Silicon) e Windows/Linux (Intel/AMD) e envia
docker buildx build --platform linux/amd64,linux/arm64 \
  -f drawio/Dockerfile -t SEU_USUARIO/drawio-arquitetura:latest --push .
```

Os outros devs rodam:

```bash
docker run -d -p 9293:8080 -e DRAWIO_LANG=pt-br SEU_USUARIO/drawio-arquitetura:latest
```

### Opção 2: Arquivo `.tar` (sem registry)

```bash
docker save drawio-arquitetura:latest | gzip > drawio-arquitetura.tar.gz   # você
docker load < drawio-arquitetura.tar.gz                                      # quem recebe
docker run -d -p 9293:8080 -e DRAWIO_LANG=pt-br drawio-arquitetura:latest
```

> ⚠️ O `.tar` só funciona na mesma arquitetura em que foi gerado (ex.: gerado num Mac M1/M2/M3, roda em outros Macs Apple Silicon).

### Opção 3: Compartilhar esta pasta

Quem tiver a pasta `Template` roda `docker compose up -d --build`.

## ⚙️ Configurar o editor

Edite `drawio/config.json` e rode `docker compose restart`. Opções disponíveis: [documentação de configuração do draw.io](https://www.drawio.com/doc/faq/configure-diagram-editor).
