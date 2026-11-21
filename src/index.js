#!/usr/bin/env node
import { writeFile } from "node:fs/promises"; 
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { Command }  from "commander";
const program = new Command();

program
  .name("wordfreq")
  .description("Count word frequencies in a text file")
  .version("1.0.0")
  .argument("<file>", "path to a text file")
  .option("-n, --top <n>", "how many words to show", process.env.DEFAULT_TOP ?? "10")
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
    const counts = new Map();
    try{
     const rl = createInterface({
      input: createReadStream(file, {encoding: "utf8"}),
      crlfDelay: Infinity,
     });

     for await (const line of rl){
      const text = options.ignoreCase ? line.toLowerCase() : line;
      const words = text.match(/[\p{L}\p{N}']+/gu) ?? [];
      for (const word of words){
        counts.set(word, (counts.get(word) ?? 0) +1);
      }
     }
    } catch(err){
      if (err.code === "ENOENT") {
        console.error(`wordfreq: output folder not found: ${file}`);
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
      try{
        await writeFile(options.out, output + "\n", "utf8");
      } catch(err){
        if(err.code === "ENOENT"){
        console.error(`wordfreq: file not found: ${options.out}`);
        process.exitCode = 1;
        return;
       }
        throw err;
      }
      console.error(`wordfreq: wrote ${options.out}`);
    } else{
      console.log(output);
    }
  });
await program.parseAsync();