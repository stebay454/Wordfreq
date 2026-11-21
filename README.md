# wordfreq

A small command-line tool that counts how often each word appears in a text file and shows the most common ones.

It was built as the Week 1 project of a backend learning roadmap, to practice Node.js fundamentals in one real tool: ES modules, `fs`, streams, `process`, environment variables, `commander`, and npm packaging.

## Features

- Reads the file as a **stream**, line by line, so memory use does not grow with file size.
- Shows the top N words (default 10).
- Optional case-insensitive counting.
- Output as aligned plain text or as JSON.
- Prints to the terminal or writes to a file.
- Friendly error messages and meaningful exit codes, so it works inside scripts.
- Results go to **stdout** and messages go to **stderr**, so piping and redirecting behave correctly.

## Requirements

- Node.js 22.9 or newer (developed on Node 26)
- npm

## Install

```bash
git clone <your-repo-url>
cd wordfreq
npm install
npm link
```

`npm link` creates a global `wordfreq` command that points at this folder. After it finishes, open a new terminal and check:

```bash
wordfreq --version
```

> **nvm users:** the link is created inside the global folder of the Node version you are currently using. If you switch Node versions, run `npm link` again.

To remove the command later, run `npm unlink -g wordfreq`.

## Usage

```bash
wordfreq <file> [options]
```

Examples:

```bash
# Top 10 words in a file
wordfreq notes.txt

# Top 5, treating "The" and "the" as the same word
wordfreq notes.txt --top 5 --ignore-case

# JSON output
wordfreq notes.txt -i -f json

# Save the result to a file instead of printing it
wordfreq notes.txt -i --out result.txt

# Redirect stdout; the "wrote ..." status message still shows on screen
wordfreq notes.txt --out result.txt > nothing.txt

# Send only the error messages to a file
wordfreq missing.txt 2> errors.txt
```

## Options

| Option | Short | Default | Description |
|---|---|---|---|
| `<file>` | | required | Path to a text file. Relative paths are resolved from the folder you run the command in. |
| `--top <n>` | `-n` | `10` | How many words to show. Must be a positive whole number. |
| `--ignore-case` | `-i` | off | Treat `The` and `the` as the same word. Output is lowercase. |
| `--format <type>` | `-f` | `text` | `text` or `json`. |
| `--out <path>` | `-o` | none | Write the result to this file instead of printing it. The folder must already exist. |
| `--version` | `-V` | | Print the version. |
| `--help` | `-h` | | Show usage. |

## Sample output

For a file containing `The cat sat on the mat. The dog sat too.`:

```bash
wordfreq sample.txt --top 3 -i
```

```text
    3  the
    2  sat
    1  cat
```

```bash
wordfreq sample.txt --top 3 -i --format json
```

```json
[
  {
    "word": "the",
    "count": 3
  },
  {
    "word": "sat",
    "count": 2
  },
  {
    "word": "cat",
    "count": 1
  }
]
```

When two words have the same count, the one that appeared first in the file is listed first.

## What counts as a word

A word is an unbroken run of letters (in any language), digits, and straight apostrophes (`'`). Everything else, such as spaces, punctuation, and symbols, separates words.

| Text | Words found |
|---|---|
| `don't` | `don't` (one word) |
| `well-known` | `well`, `known` (the hyphen separates) |
| `3.14` | `3`, `14` |
| `don’t` (curly apostrophe) | `don`, `t` (only the straight `'` is matched) |

## Configuration

The default for `--top` can come from an environment variable, `DEFAULT_TOP`.

1. Copy `.env.example` to `.env` and set a value, for example `DEFAULT_TOP=5`.
2. Create `.env` in a code editor. On Windows PowerShell 5, `echo "X=5" > .env` saves the file as UTF-16, which Node cannot parse.

**Important:** Node does not load `.env` on its own. It is only read when the program is started with the `--env-file` flag:

```bash
node --env-file=.env src/index.js notes.txt
npm run dev -- notes.txt
```

The globally linked `wordfreq` command does **not** load `.env`, so it always falls back to `10` unless you pass `--top`.

Priority, from strongest to weakest: the `--top` flag, then `DEFAULT_TOP`, then the built-in `10`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | Success (including `--help` and `--version`). |
| `1` | Any failure: missing or unknown arguments, invalid `--top` or `--format`, input file not found, input path is a folder, or the output folder does not exist. Unexpected errors also exit with `1` and print a stack trace. |

## How it works

1. **Parse arguments** with `commander`, which also generates `--help` and `--version`.
2. **Validate** `--top` (positive whole number) and `--format` (`text` or `json`). Option values arrive as strings, so `--top` is converted with `Number()`.
3. **Stream the file** with `createReadStream` and `readline`, one line at a time.
4. **Normalize and tokenize** each line: lowercase it if `-i` was given, then extract words with the regex `/[\p{L}\p{N}']+/gu`.
5. **Count** in a `Map` (word to count). A `Map` is used instead of a plain object because an object has built-in keys such as `constructor`, which would corrupt the count if that word appeared in a file.
6. **Sort** the entries by count, highest first, and keep the first N.
7. **Format** the result as aligned text or as a JSON array. An array is used because JavaScript objects reorder integer-like keys such as `2024`, which would break the sort order.
8. **Output** to stdout, or to the `--out` file with a status line on stderr.

## Project structure

```text
wordfreq/
├── src/
│   └── index.js        # the whole CLI
├── .env.example        # example environment file (the real .env is git-ignored)
├── .gitignore
├── package.json        # "bin" maps the wordfreq command to src/index.js
└── README.md
```

## Limitations

- The file is read as a stream, but the counts live in memory, so memory grows with the number of **different** words, not with the file size.
- Words are not stemmed (`run`, `runs`, and `running` are separate), and there is no stop-word filter, so words like `the` will usually be at the top.
- Without `-i`, counting is case-sensitive.
- Only straight apostrophes are treated as part of a word.
- Only `ENOENT` and `EISDIR` on the input, and `ENOENT` on the output, get friendly messages. Other errors (such as permission problems) show a raw error.

## Troubleshooting

| Problem | Likely cause and fix |
|---|---|
| `'wordfreq' is not recognized` | `npm link` has not been run, or you are in an old terminal window, or you switched Node versions with nvm. Run `npm link` again and open a new terminal. |
| `file not found` for a file that exists | Relative paths resolve from your current folder, not from the script's folder. Check where you are, and check for a hidden `.txt.txt` extension on Windows. |
| `.env` value is ignored | The `.env` file is only loaded with `--env-file`, and the global command never passes it. Also check that the file is UTF-8, not UTF-16. |
| `Cannot use 'import.meta' outside a module` | `package.json` needs `"type": "module"`. |

## License

ISC
