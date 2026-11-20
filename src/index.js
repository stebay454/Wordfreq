import { readFile, writeFile } from "node:fs/promises"; 
import { Command }  from "commander";
const program = new Command();

program
  .name("wordfreq")
  .description("Count word frequencies in a text file")
  .version("1.0.0")
  .argument("<file>", "path to a text file")
  .option("-n, --top <n>", "how many words to show", "10")
  .option("-i, --ignore-case", "treat The and the as the same word")
  .option("-f, --format <type>", "text or json", "text")
  .option("-o, --out <path>", "write result to a file instead of stdout")
  .action(async (file, options) => {
    const top = Number(options.top);
    if(!Number.isInteger(top) || top < 1){
      program.error("--top must be a positive whole number");
    }
    if(options.format !== "text" && options.format !== "json"){
      program.error("--format must be text or json");
    }
    let text;
    try{
     text = await readFile(file, "utf8");
    } catch(err){
     if(err.code === "ENOENT"){
        console.error(`wordfreq: file not found: ${file}`);
        process.exitCode = 1;
        return;
     }
     if (err.code === "EISDIR") {
     console.error(`wordfreq: ${file} is a folder, not a file`);
     process.exitCode = 1;
     return;
    }
     throw err;
    }
    const normalized = options.ignoreCase ? text.toLowerCase() : text;
    const words = normalized.match(/[\p{L}\p{N}']+/gu) ?? [];
    const counts = new Map();
    for(const word of words){
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    const result = [...counts.entries()]
    .sort((a,b) => b[1] - a[1])
    .slice(0, top);
  
    let output;
    if(options.format == "json"){
      output = JSON.stringify(
        result.map(([word,count]) => ({ word, count})),
        null,
        2,
      );
    } else{
      output = result
      .map(([word,count]) => `${String(count).padStart(5)} ${word}`)
      .join("\n");
    }

    if(options.out){
      await writeFile(options.out, output + "\n", "utf8");
      console.error(`wordfreq: wrote ${options.out}`);
    } else{
      console.log(output);
    }
  });
await program.parseAsync();