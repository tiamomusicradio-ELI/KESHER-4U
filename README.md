# Kesher-4U · מוקד שירות ותקלות

מערכת לדיווח, מעקב ופילוח קריאות: טלפוניה, כריזה, אמצעי קשר, מערכות רציפות, לחצני מצוקה, טלוויזיה בכבלים, מצלמות ואירועי הגברה.

## איך זה בנוי (הכל בחינם)

```
 משתמשים ──► Render · Static Site            ← האתר (תיקיית web/)
                  │
                  ▼
            Google Apps Script               ← השרת (תיקיית apps-script/)
                  │
                  ▼
            Google Sheets ב־Drive שלך        ← הנתונים, יומן השינויים והגיבויים

 GitHub ── הקוד והתיעוד. כל שינוי כאן מתעדכן ב־Render אוטומטית
```

| תיקייה | מה יש בה |
|---|---|
| `web/` | האתר ש־Render מגיש. ב־`web/settings.js` נמצאת הכתובת של השרת |
| `apps-script/` | הקוד שמודבקים ב־Google Apps Script. **`Config.gs` = רשימות הנושאים והמבנים** |
| `docs/` | תיעוד: [רשימות](docs/lists.md) · [מבנה הנתונים](docs/data.md) |

---

## התקנה — שלב אחרי שלב

### שלב 1 · Google: גיליון הנתונים והשרת (כ־7 דקות)

1. פותחים את הגיליון **Kesher-4U — נתונים** ב־Google Drive. אם הוא לא קיים, יוצרים גיליון חדש בשם הזה.
2. בתפריט של הגיליון: **תוספים (Extensions) → Apps Script**. נפתח עורך קוד בלשונית חדשה.
3. למעלה, במקום *Untitled project*, כותבים את השם **Kesher-4U**.
4. **הקובץ `Code.gs`:** מוחקים את כל מה שכתוב בעורך ומדביקים את כל התוכן של `apps-script/Code.gs`.
5. **הקובץ `Config`:** לוחצים על **+** שליד *Files*, בוחרים **Script** וקוראים לו `Config`. מדביקים בו את התוכן של `apps-script/Config.gs`.
6. *(רשות)* **הקובץ `Index`:** לוחצים **+**, בוחרים **HTML** וקוראים לו `Index`. מדביקים בו את התוכן של `apps-script/Index.html`. הקובץ הזה מאפשר לפתוח את המערכת גם ישירות מ־Google, בלי Render.
7. לוחצים 💾 **שמירה**.
8. בסרגל העליון בוחרים את הפונקציה **`setup`** ולוחצים **▶ Run**.
   - כשמופיע *Authorization required*, לוחצים **Review permissions** ובוחרים את החשבון.
   - כשמופיע *Google hasn't verified this app*, לוחצים **Advanced** ואז **Go to Kesher-4U (unsafe)** ו־**Allow**. זה תקין: אתה המפתח של הסקריפט.
   - בסוף ההרצה, בגיליון נוצרות שלוש לשוניות: קריאות, מדווחים ויומן שינויים.
9. **סיסמה:** לוחצים על ⚙️ **Project Settings** בצד שמאל. בתחתית יש **Script Properties**: לוחצים **Add script property** וממלאים:
   - Property: `APP_PASSWORD`
   - Value: הסיסמה שהצוות יקליד בכניסה לאתר

   לוחצים **Save script properties**. בלי הסיסמה האתר לא מציג נתונים בכלל.
10. **פרסום השרת:** לוחצים **Deploy → New deployment**, ואז על ⚙️ שליד *Select type* בוחרים **Web app**. ממלאים:
    - Description: `Kesher-4U`
    - Execute as: **Me**
    - Who has access: **Anyone**

    לוחצים **Deploy**.
11. מעתיקים את ה־**Web app URL**. זו כתובת שמסתיימת ב־`/exec`, ונצטרך אותה בשלב 2.

### שלב 2 · GitHub: המאגר (כ־3 דקות)

1. ב־[github.com/new](https://github.com/new) ממלאים:
   - Repository name: `kesher-4u`
   - בוחרים **Private**

   לוחצים **Create repository**.
2. בעמוד שנפתח לוחצים על הקישור **uploading an existing file**.
3. פותחים את הקובץ `kesher-4u.zip` במחשב, ו**גוררים את כל מה שבתוך התיקייה** (התיקיות web, apps-script, docs ושאר הקבצים) לחלון של GitHub. לוחצים **Commit changes**.
4. במאגר נכנסים ל־`web` ואז ל־`settings.js`, ולוחצים ✏️ (Edit). בשורה `var API_URL = '';` מדביקים בין הגרשיים את הכתובת משלב 1:
   ```js
   var API_URL = 'https://script.google.com/macros/s/……/exec';
   ```
   לוחצים **Commit changes**.

### שלב 3 · Render: האתר (כ־2 דקות)

1. ב־Render: **New → Static Site**, ובוחרים מהרשימה את `kesher-4u`. אם המאגר לא מופיע, לוחצים **Credentials** ומאשרים ל־Render גישה למאגר.
2. ממלאים:
   - Name: `kesher-4u`
   - Branch: `main`
   - Root Directory: *ריק*
   - Build Command: `echo ok`
   - Publish Directory: `web`
3. לוחצים **Deploy Static Site**. אחרי כדקה האתר זמין בכתובת כמו `https://kesher-4u.onrender.com`.
4. נכנסים לאתר ומקלידים את הסיסמה משלב 1. מוכן ✓

---

## עבודה שוטפת

**לראות את הנתונים:** הכל נמצא בגיליון **Kesher-4U — נתונים**: לשונית לקריאות, לשונית למדווחים ולשונית "יומן שינויים". אפשר לסנן, למיין, ולהוריד לאקסל דרך קובץ → הורדה.

> ⚠️ **אין לערוך ידנית שורות בגיליון.** כל השינויים צריכים לעבור דרך האתר. העמודות המוסתרות (`id`, `updated`, `deleted`, `json`) הן הנתונים שהאתר קורא. מותר לקרוא, לסנן ולהעתיק.

**גיבוי:** כל לילה נשמר עותק של הגיליון בתיקייה **Kesher-4U גיבויים** ב־Drive, וגיבויים בני יותר מ־90 יום נמחקים. בנוסף, ל־Google Sheets יש היסטוריית גרסאות: **קובץ → היסטוריית גרסאות**.

**שינוי רשימות (נושאים, תתי־נושא, מבנים):**
1. עורכים את `Config.gs` בעורך Apps Script ושומרים.
2. **Deploy → Manage deployments**, לוחצים ✏️, ובשדה Version בוחרים **New version** ולוחצים **Deploy**. הכתובת נשארת אותה כתובת.
3. מעתיקים את אותו שינוי ל־`apps-script/Config.gs` ב־GitHub, כדי שהתיעוד יישאר מעודכן.

> אין לשנות את המזהה `k` של נושא שכבר יש בו קריאות, כי הפילוח נשען עליו. מותר לשנות את השם `n`.

**שינוי בעיצוב האתר:** עורכים את `web/index.html` ב־GitHub. Render מתעדכן אוטומטית.

**החלפת סיסמה:** משנים את `APP_PASSWORD` ב־Script Properties. כל המשתמשים יתבקשו להקליד את הסיסמה החדשה.

## מגבלות שכדאי להכיר
- **רענון:** האתר בודק שינויים מהשרת כל 15 שניות. לכן קריאה שנפתחה במחשב אחד מופיעה באחרים תוך עד 15 שניות.
- **מכסות של Google Apps Script:** מתאימות לצוות של עשרות משתמשים. בדיקת עדכונים שאין בה שינויים לא קוראת את הגיליון, ולכן היא כמעט לא צורכת מכסה.
- **גודל:** Google Sheets מחזיק עד 10 מיליון תאים, כלומר מאות אלפי קריאות.

## למפתחים
- `npm test`: בדיקת תחביר ורשימות, ובדיקות יחידה לשרת מול גיליון מדומה.
- `npm run dev`: האתר במחשב, מול שרת מדומה, בכתובת http://localhost:3400. הסיסמה היא `pw`.
- אחרי שינוי ב־`web/index.html` מריצים `npm run build`. הפקודה מעדכנת את `apps-script/Index.html` ואת `docs/lists.md`.
- API (POST ל־`/exec` עם גוף `{"fn": "...", "args": [...]}`): `apiConfig()`, `apiSync(password, since)`, `apiPut(password, col, id, data, agent)`, `apiDel(password, col, id, agent)`.
