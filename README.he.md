<div dir="rtl">

# Claude Usage Monitor

<div align="center">

**🌐 Language / Langue / Idioma / 语言 / שפה**

[![English](https://img.shields.io/badge/English-blue?style=flat-square)](README.md)
[![Français](https://img.shields.io/badge/Français-blue?style=flat-square)](README.fr.md)
[![Español](https://img.shields.io/badge/Español-blue?style=flat-square)](README.es.md)
[![中文](https://img.shields.io/badge/中文-blue?style=flat-square)](README.zh.md)
[![עברית](https://img.shields.io/badge/עברית-orange?style=flat-square)](README.he.md)

---

![Version](https://img.shields.io/badge/version-3.3-orange)
![Chrome](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

**עקוב אחר השימוש שלך ב-Claude Code עם מחוונים מעגליים יפים**

[התחלה מהירה](#התחלה-מהירה) | [התקנה](#התקנה) | [תכונות](#תכונות) | [פתרון בעיות](#פתרון-בעיות)

</div>

---

## סקירה כללית

Claude Usage Monitor הוא תוסף Chrome שמציג את השימוש שלך ב-API של Claude בזמן אמת. עקוב אחר מגבלות 5 השעות ו-7 הימים שלך במבט אחד, קבל התראות לפני שתגיע למכסה.

**מושלם למשתמשי Claude Code ו-Claude Max.**

## התחלה מהירה

1. **הורד** את [קובץ ה-ZIP האחרון](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. **חלץ** את קובץ ה-ZIP
3. **פתח** את `chrome://extensions/` והפעל מצב מפתח
4. **לחץ** על "טען תוסף לא ארוז" ובחר את התיקייה
5. **העתק** את תוכן `.credentials.json` שלך והדבק בתוסף

זהו! התוסף ינתח אוטומטית את הטוקנים שלך ויתחיל לעקוב.

## תכונות

| תכונה | תיאור |
|--------|--------|
| **מעקב בזמן אמת** | עקוב אחר מכסות 5 שעות ו-7 ימים |
| **התקדמות ויזואלית** | מחווני התקדמות מעגליים יפים |
| **קידוד צבעים** | ירוק (< 50%), כתום (50-80%), אדום (> 80%) |
| **התראות חכמות** | התראות ב-70%, 80%, 90%, 95% שימוש |
| **רענון אוטומטי** | מתעדכן אוטומטית כל דקה |
| **רב-שפתי** | אנגלית, צרפתית, ספרדית, סינית, עברית |
| **זיהוי אוטומטי** | מזהה אוטומטית את שפת הדפדפן |
| **הגדרה קלה** | פשוט הדבק את ה-JSON שלך |
| **ערכת נושא כהה** | ממשק מודרני מעוצב למפתחים |
| **פרטיות קודם** | כל הנתונים נשארים מקומיים |

## התקנה

### אפשרות 1: הורדה מ-Releases (מומלץ)

1. עבור ל-[Releases](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. הורד את `claude-usage-monitor-v3.3.zip`
3. חלץ את ה-ZIP לתיקייה
4. פתח את Chrome ועבור ל-`chrome://extensions/`
5. הפעל **מצב מפתח** (מתג בפינה הימנית העליונה)
6. לחץ על **"טען תוסף לא ארוז"**
7. בחר את התיקייה שחילצת

### אפשרות 2: שכפול Repository

```bash
git clone https://github.com/showf68/claude-usage-monitor.git
cd claude-usage-monitor
```

לאחר מכן טען את התיקייה ב-Chrome כמתואר לעיל.

## הגדרה

### שלב 1: מצא את האישורים שלך

אישורי Claude שלך מאוחסנים ב:

| פלטפורמה | נתיב |
|----------|------|
| **Windows** | `%USERPROFILE%\.claude\.credentials.json` |
| **macOS** | `~/.claude/.credentials.json` |
| **Linux** | `~/.claude/.credentials.json` |

### שלב 2: העתק והדבק

1. פתח את קובץ האישורים בכל עורך טקסט
2. **בחר הכל** (Ctrl+A / Cmd+A)
3. **העתק** (Ctrl+C / Cmd+C)
4. לחץ על סמל התוסף ב-Chrome
5. **הדבק** את תוכן ה-JSON המלא
6. לחץ על **"שמור והתחבר"**

התוסף מחלץ אוטומטית את `accessToken` ו-`refreshToken` מה-JSON שלך.

## שימוש

### תג סרגל הכלים

התג מציג את אחוז השימוש הנוכחי שלך ב-5 שעות:

| תג | צבע | סטטוס |
|----|-----|-------|
| `25` | ירוק | שימוש נמוך |
| `65` | כתום | שימוש בינוני |
| `90` | אדום | שימוש גבוה - האט! |
| `CFG` | צהוב | נדרשת הגדרה |
| `ERR` | אדום | שגיאת חיבור |

### ממשק הקופץ

לחץ על סמל התוסף כדי לראות:
- **שימוש 5 שעות** - חלון נוכחי עם התקדמות מעגלית
- **שימוש 7 ימים** - מעקב מכסה שבועית
- **טיימר איפוס** - זמן עד שהמגבלות מתחדשות
- **עדכון אחרון** - מתי הנתונים רועננו לאחרונה

## פתרון בעיות

<details>
<summary><b>תג ERR או "שגיאת חיבור"</b></summary>

1. בדוק את חיבור האינטרנט שלך
2. ודא שהטוקן שלך לא פג
3. נסה להגדיר מחדש עם אישורים חדשים
4. טען מחדש את התוסף מ-`chrome://extensions/`
</details>

<details>
<summary><b>תג CFG</b></summary>

התוסף צריך הגדרה:
1. לחץ על סמל התוסף
2. הדבק את תוכן `.credentials.json` שלך
3. לחץ על "שמור והתחבר"
</details>

## פרטיות ואבטחה

| היבט | פרטים |
|------|--------|
| **איסוף נתונים** | אין - כל הנתונים נשארים מקומיים |
| **אחסון טוקנים** | API אחסון מאובטח של Chrome |
| **קריאות רשת** | רק ל-APIs הרשמיים של Anthropic |
| **קוד פתוח** | קוד מלא זמין לביקורת |

## רישיון

רישיון MIT - ראה [LICENSE](LICENSE) לפרטים.

---

<div align="center">

**נבנה עבור קהילת המפתחים של Claude**

אם התוסף הזה עוזר לך, שקול לתת לו כוכב

[דווח על באג](https://github.com/showf68/claude-usage-monitor/issues) | [בקש תכונה](https://github.com/showf68/claude-usage-monitor/issues)

</div>

</div>
