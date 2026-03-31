const fs = require('fs');

const generatorPath = 'src/game/generator.ts';
const teamsPath = 'teams_output.ts';

const generatorContent = fs.readFileSync(generatorPath, 'utf-8');
const teamsContent = fs.readFileSync(teamsPath, 'utf-8');

const lines = generatorContent.split('\n');

const topPart = lines.slice(0, 61).join('\n');
const bottomPart = lines.slice(137).join('\n');

const newContent = topPart + '\n\n' + teamsContent + '\n' + bottomPart;

fs.writeFileSync(generatorPath, newContent);
