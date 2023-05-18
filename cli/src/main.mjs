#!/usr/bin/env node
import {Command} from "commander";
import chalk from "chalk";
import fs from "fs";
import Translator from "shopify-locale-translator-core";
import ora from "ora";

// Load environment variables
import dotenv from "dotenv";
import esMain from "es-main";

const program = new Command();
dotenv.config();

program
    .name("shopify-locale-translator-cli")
    .description("A CLI tool to translate Shopify locales")
    .version('0.0.1')

// Translate command
program.command('translate')
    .description('Translate a Shopify locale')
    .option('-i, --input <input>', 'The locale file to translate, uses locales/*.default.json if not provided')
    .option('-o, --output <output>', 'Language to translate to, outputs to console if not provided')
    .option('--to <to>', 'Language to translate to, uses output file name if not provided')
    .option('--from <from>', 'Language to translate from, uses input file name if not provided')
    .option('--api <api>', 'Translation API to use, defaults to libretranslate')
    .option('--api-key <api_key>', 'API key to use, if required by the API')
    .option('--url <url>', 'Override the API request URL')
    .option('--quiet', 'Do not output anything to the console')
    .option('--no-spinner', 'Do not show a cli spinner')
    .option('--watch', 'Watch the input file for changes and re-translate')
    .action(translateHandler);

async function translateFile(input, from, to, translator, spinner, locale, output) {
    console.log(chalk.green(`Translating ${input} from '${from}' to '${to}' with ${translator.api}`));
    /** @type {Ora} */
    let spinnerInstance;
    if (spinner) {
        spinnerInstance = ora("Translating...").start();
    }
    let result;
    try {
        result = await translator.translate(locale, from, to);
    } catch (e) {
        console.log(chalk.red(`Error translating locale file ${input}`));
        console.log(chalk.red(e));
        process.exit(1);
    }
    if (spinner) {
        spinnerInstance.succeed("Translation complete");
    }
    if (output !== undefined) {
        if (spinner) {
            spinnerInstance = ora(`Writing to ${output}`).start();
        } else {
            console.log(chalk.green(`Writing to ${output}`));
        }
        fs.writeFileSync(output, JSON.stringify(result, null, 2));
        if (spinner) {
            spinnerInstance.succeed("File written");
        }
    } else {
        console.log(JSON.stringify(result, null, 2));
    }
    if (spinner) {
        spinnerInstance.stop();
    }
}

async function translateHandler(options) {
    let {input, from, to, output, quiet, spinner, watch, apiUrl} = options;
    if (quiet) { // Disable console output
        console.log = () => {};
    }
    if (input === undefined) {
        console.log(chalk.yellow("No input file provided, checking for locales/*.default.json"));
        if (!fs.existsSync('locales')) {
            console.log(chalk.red("No locales folder found"));
            process.exit(1);
        }
        // Find which is the default locale file "*.default.json"
        let files = fs.readdirSync('locales');
        let defaultLocale = files.find(file => file.endsWith('.default.json'));
        if (defaultLocale === undefined) {
            console.log(chalk.red("No default locale file found"));
            process.exit(1);
        }
        input = `locales/${defaultLocale}`;
    }
    if (from === undefined) {
        // Get language from file name path/{language}.json
        let filename = input.split('/').slice(-1)[0];
        from = filename.split('.')[0];
    }
    if (to === undefined) {
        if (output === undefined) {
            console.log(chalk.red("No output file provided, cannot guess language to translate to"));
            process.exit(1);
        }
        // Get language from file name
        let filename = output.split('/').slice(-1)[0];
        to = filename.split('.')[0];
    }
    let locale;
    try {
        locale = fs.readFileSync(input, 'utf8');
        locale = JSON.parse(locale);
    } catch (e) {
        console.log(chalk.red(`Error parsing locale file ${input}`));
        process.exit(1);
    }
    let translator = new Translator()
        .configure({
            api: options.api ?? process.env.API ?? "libretranslate",
            api_key: options.api_key ?? process.env.API_KEY ?? "",
            url: options.url ?? process.env.API_URL ?? "",
        });
    await translateFile(input, from, to, translator, spinner, locale, output);
    if (watch) {
        console.log(chalk.green(`Watching ${input} for changes`));
        fs.watchFile(input, async () => {
            await translateFile(input, from, to, translator, spinner, locale, output);
        });
    }
}

if (esMain(import.meta)) {
    await program.parseAsync();
}

export default program;

