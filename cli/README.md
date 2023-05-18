# Shopify Locale Translator CLI

## Installation

Install from source:

```bash
git clone git@github.com:Auto-Finesse/shopify-locale-translator.git
cd shopify-locale-translator/cli
npm install -g .
```

If available you can install the CLI via npm:

```bash
npm install -g shopify-locale-translator-cli
```

## Usage

Use the `shopify-locale-translator-cli` binary to call any translation
function. Here is the help output:

```bash
shopify-locale-translator-cli help
# Usage: shopify-locale-translator-cli [options] [command]
# 
# A CLI tool to translate Shopify locales
# 
# Options:
#   -V, --version        output the version number
#   -h, --help           display help for command
# 
# Commands:
#   translate [options]  Translate a Shopify locale
#   help [command]       display help for command
```

To translate a file:

```bash
shopify-locale-translator-cli help translate
# Usage: shopify-locale-translator-cli translate [options]
# 
# Translate a Shopify locale
# 
# Options:
#   -i, --input <input>    The locale file to translate, uses locales/*.default.json if not provided
#   -o, --output <output>  Language to translate to, outputs to console if not provided
#   --to <to>              Language to translate to, uses output file name if not provided
#   --from <from>          Language to translate from, uses input file name if not provided
#   --api <api>            Translation API to use, defaults to libretranslate
#   --api-key <api_key>    API key to use, if required by the API
#   --url <url>            Override the API request URL
#   --quiet                Do not output anything to the console
#   --no-spinner           Do not show a cli spinner
#   --watch                Watch the input file for changes and re-translate
#   -h, --help             display help for command
```

To translate a file from English to Spanish _(All the commands bellow are
**equivalent** with the right setup)_:

```bash
shopify-locale-translator-cli translate -i locales/en.default.json --from en --to es -o locales/es.json
# --from and --to are optional and will be inferred from the input and output file names if not provided
shopify-locale-translator-cli translate -i locales/en.default.json -o locales/es.json
# -i or --input is also optional, it will default to locales/*.default.json
shopify-locale-translator-cli translate -o locales/es.json
```

To watch a file for changes and re-translate:

```bash
shopify-locale-translator-cli translate -o locales/es.json --watch
```

## Development

To initialize the development environment:

```bash
npm install
```

If you want to use a local API key or url you can create a `.env` file in the
root of the project with the following content:

```dotenv
# .env
API_KEY=your-api-key
API_URL=your-api-url
```

For example, internally we use the .env bellow to test the translation on our
local libretranslate api to avoid rate limiting:

```dotenv
# .env
API_URL=http://192.168.0.108:5001/translate/translate
```

### Testing

All tests are located in the `test` directory. To run the tests:

```bash
npm run test
```