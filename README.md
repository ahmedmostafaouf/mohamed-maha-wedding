# دعوة زفاف محمد & مها

موقع static بالكامل — **من غير npm**. الخطوط من Google Fonts (CDN).

## تشغيل

افتح الملف مباشرة، أو أي استضافة static:

- GitHub Pages
- Netlify / Cloudflare Pages
- أو أي CDN

الملفات الأساسية: `index.html` + `templates/` + `data/rsvp.json`

## تأكيد الحضور

- يُعرض من `data/rsvp.json`
- الردود الجديدة تُحفظ في المتصفح (localStorage)
- لو شغّلت `node server.js` (اختياري، بدون حزم) الردود تتحفظ في الملف كمان

## اختياري: سيرفر محلي بدون npm install

```bash
node server.js
```
