# وصفات الحلويات 🍰

موقع عربي لعرض وصفات الحلويات مع **فلترة حسب النوع** (شرقية، بالقطر، غربية، باردة) و**بحث بالاسم**. عند الضغط على أي وصفة تظهر مكوناتها وطريقة تحضيرها.

## قاعدة البيانات (3 جداول)

| الجدول | الأعمدة |
|---|---|
| `categories` | `id`, `name` (نوع الحلويات) |
| `recipes` | `id`, `name`, `category_id` ← FK إلى `categories`, `instructions` |
| `ingredients` | `id`, `recipe_id` ← FK إلى `recipes`, `name`, `quantity` |

## طريقة التشغيل

**قاعدة البيانات**

1. افتحي pgAdmin وأنشئي قاعدة بيانات باسم `dessert_recipes`.
2. افتحي Query Tool على هذه القاعدة وشغّلي كامل محتوى `backend/schema.sql` (ينشئ الجداول ويضيف 16 وصفة تجريبية).

**السيرفر (Backend)**

3. انسخي `backend/.env.example` إلى `backend/.env` وضعي بيانات الاتصال (خصوصاً `DB_PASSWORD`).
4. من مجلد المشروع شغّلي:
   ```bash
   npm install
   npm start
   ```
   سيعمل على `http://localhost:3000`.

**الواجهة (Frontend)**

5. افتحي `frontend/index.html` في المتصفح أو شغّليه بـ Live Server.

## الـ API

| الطريقة | المسار | الوصف |
|---|---|---|
| GET | `/api/categories` | كل الأنواع |
| GET | `/api/recipes?category=1&search=كنافة` | الوصفات (الفلتر والبحث اختياريان ويعملان معاً) |
| GET | `/api/recipes/:id` | وصفة واحدة مع مكوناتها (404 إن لم توجد) |

البحث يتجاهل الفرق بين `أ/إ/آ/ا` و`ة/ه` و`ى/ي`، فكتابة "كنافه" تجد "كنافة".

## المميزات

- [x] واجهة عربية بالكامل (RTL) متجاوبة مع الجوال
- [x] فلترة حسب النوع + بحث بالاسم (معاً)
- [x] نافذة تعرض المكونات وطريقة التحضير
- [x] وضع داكن
- [x] البيانات محفوظة في PostgreSQL

## إضافة وصفة جديدة

```sql
INSERT INTO recipes (name, category_id, instructions)
VALUES ('اسم الوصفة', (SELECT id FROM categories WHERE name = 'حلويات شرقية'),
'الخطوة الأولى
الخطوة الثانية');

INSERT INTO ingredients (recipe_id, name, quantity)
SELECT id, 'سكر', '1 كوب' FROM recipes WHERE name = 'اسم الوصفة';
```

(كل سطر في `instructions` يظهر كخطوة مرقمة.)
