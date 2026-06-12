const fs = require('fs');
const https = require('https');

const url = "https://assets2.lottiefiles.com/packages/lf20_5n8yxamk.json";

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
}, (res) => {
  if (res.statusCode === 200) {
    const file = fs.createWriteStream('public/face-scan.json');
    res.pipe(file);
    file.on('finish', () => {
      console.log('Downloaded successfully');
    });
  } else {
    console.log(`Failed with status: ${res.statusCode}`);
  }
}).on('error', (err) => {
  console.log(`Error: ${err.message}`);
});
