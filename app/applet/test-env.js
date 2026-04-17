console.log(Object.keys(process.env).filter(k => k.includes('API') || k.includes('GEMINI') || k.includes('KEY')));
