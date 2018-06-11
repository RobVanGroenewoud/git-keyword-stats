#!/usr/bin/env node
"use strict";

const exec = require("child_process").exec;
const fs = require("fs");
const meow = require("meow");
const chalk = require("chalk");
const error = chalk.bold.red;

const cli = meow(
  `
	Usage
	  $ git-keyword-stats <path> [options]

	Options
    --keywords, -k  Comma separated keywords
    --output, -o    Output file path, default: './keyword-stats.json'

	Examples
	  $ git-keyword-stats . --keywords=keyword1,keyword2
`,
  {
    flags: {
      keywords: {
        type: "string",
        alias: "k"
      },
      output: {
        type: "string",
        alias: "o",
        default: "./keyword-stats.json"
      }
    }
  }
);

function keywordStats(dir, keyword) {
  const cmd = `git log --pretty=format:"[%an<%ae>] %s" --no-merges --grep="${keyword}" | sed 's/\\[\\([^]]*\\)] .*/\\1/' | sort | uniq -c | sort -r`;
  const options = {
    cwd: dir
  };
  return new Promise((resolve, reject) => {
    exec(cmd, options, (err, stdout, stderr) => {
      if (err) return reject(err);
      if (stderr) return reject(stderr);

      const statistics = stdout
        .split("\n")
        .map(line => line.match(/(\d+)\s(.*)<(.*)>/))
        .filter(matches => !!matches)
        .map(matches => {
          return { commits: matches[1], author: matches[2], email: matches[3] };
        });
      return resolve({ keyword: keyword, statistics: statistics });
    });
  });
}

const run = async (inputPath, outputFile, keywords) => {
  const statisticsPerKeyWord = await Promise.all(
    keywords.split(",").map(keyword => keywordStats(inputPath, keyword))
  );

  const statistics = {
    path: inputPath,
    statistics: statisticsPerKeyWord
  };

  const statisticsAsJson = JSON.stringify(statistics, undefined, 2);
  fs.writeFileSync(outputFile, statisticsAsJson);
};

const path = cli.input[0];

if (path) {
  if (fs.existsSync(path)) {
    run(path, cli.flags.output, cli.flags.keywords);
  } else {
    console.log(error(`Directory ${path} does not exist`));
    process.exit(1);
  }
} else {
  cli.showHelp();
}
