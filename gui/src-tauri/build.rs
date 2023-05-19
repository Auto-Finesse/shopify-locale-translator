use std::io::Write;

fn main() {
    tauri_build::build();

    // Make sure public dir exists
    std::fs::create_dir_all("../src/public/javascript").unwrap();
    std::fs::create_dir_all("../src/public/stylesheet").unwrap();

    // Run grass to compile the sass files into css into the static/stylesheet directory
    println!("cargo:rerun-if-changed=../src/public/sass");
    let sass_files = std::fs::read_dir("../src/public/sass").unwrap();
    let grass_options = grass::Options::default();
    let grass_options = grass_options.load_path("../src/public/sass");
    for sass_file in sass_files {
        let file_path = sass_file.unwrap().path();
        if file_path.is_dir() {
            continue;
        }
        // If the file is tailwind.css, ignore it
        if file_path.file_name().unwrap() == "tailwind.css" {
            continue;
        }
        // If the file is already a css file, just copy it over
        if file_path.extension().unwrap() == "css" {
            std::fs::copy(
                file_path.clone(),
                format!(
                    "../src/public/stylesheet/{}.css",
                    file_path.file_stem().unwrap().to_str().unwrap()
                ),
            ).unwrap();
            continue;
        }
        let css = grass::from_path(
            file_path.clone(),
            &grass_options,
        );
        match css {
            Ok(css) => {
                let mut css_file = std::fs::File::create(
                    format!(
                        "../src/public/stylesheet/{}.css",
                        file_path.file_stem().unwrap().to_str().unwrap()
                    )
                ).unwrap();
                css_file.write_all(css.as_bytes()).unwrap();
            }
            Err(err) => {
                panic!(
                    "Error compiling sass file: {} with error: {}",
                    file_path.display(), err
                );
            }
        }
    }


    // Compile typescript
    println!("cargo:rerun-if-changed=../src/public/typescript");
    let ts_files = std::fs::read_dir("../src/public/typescript").unwrap();
    for ts_file in ts_files {
        let file_path = ts_file.unwrap().path();
        if file_path.is_dir() {
            continue;
        }
        let mut cmd = std::process::Command::new("npx");
        cmd.arg("esbuild");
        cmd.arg(file_path.clone());
        cmd.arg("--bundle");
        cmd.arg("--sourcemap");
        cmd.arg("--minify");
        // Output to static/javascript bundle
        cmd.arg(format!(
            "--outfile=../src/public/javascript/{}.js",
            file_path.file_stem().unwrap().to_str().unwrap()
        ));
        let output = cmd.output().unwrap();
        if !output.status.success() {
            panic!(
                "Error compiling typescript file: {} with error: {}",
                file_path.display(),
                String::from_utf8(output.stderr).unwrap()
            );
        }
    }

    // Tailwind CLI
    // Tailwind needs to be ran at the project's root directory, out of src-tauri
    // so we need to change the current directory
    println!("cargo:rerun-if-changed=../src/view");
    std::env::set_current_dir("..").unwrap();
    let mut cmd = std::process::Command::new("npx");
    cmd.arg("tailwindcss");
    cmd.arg("-i");
    cmd.arg("./src/public/sass/tailwind.css");
    cmd.arg("-o");
    cmd.arg("./src/public/stylesheet/tailwind.css");
    let output = cmd.output().unwrap();
    if !output.status.success() {
        panic!(
            "Error compiling tailwindcss file: {} with error: {}",
            "../src/public/stylesheet/tailwind.css",
            String::from_utf8(output.stderr).unwrap()
        );
    }
}
