-- موقع وصفات الحلويات: مخطط قاعدة البيانات (PostgreSQL)
-- شغّلي هذا الملف كاملاً في pgAdmin (Query Tool) بعد إنشاء قاعدة البيانات dessert_recipes.
-- إعادة تشغيله تحذف الجداول وتبدأ من البيانات التجريبية من جديد.

DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS categories;

-- 1) جدول الأنواع (حلويات شرقية، غربية، بالقطر ...)
CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE CHECK (btrim(name) <> '')
);

-- 2) جدول الوصفات (اسم الوصفة + رقمها + نوعها + طريقة التحضير)
CREATE TABLE recipes (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL UNIQUE CHECK (btrim(name) <> ''),
  category_id  INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  instructions TEXT NOT NULL CHECK (btrim(instructions) <> '')
);

-- 3) جدول المكونات (كل مكون مربوط بالوصفة بمفتاح خارجي)
CREATE TABLE ingredients (
  id        SERIAL PRIMARY KEY,
  recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  name      VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
  quantity  VARCHAR(50)  NOT NULL CHECK (btrim(quantity) <> '')
);

CREATE INDEX idx_recipes_category_id   ON recipes(category_id);
CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);

-- ================= بيانات (أضيفي وصفاتك بعد الأنواع) =================

INSERT INTO categories (name) VALUES
  ('حلويات شرقية'),
  ('حلويات بالقطر'),
  ('حلويات غربية'),
  ('حلويات باردة');

-- كنافة نابلسية
INSERT INTO recipes (name, category_id, instructions)
VALUES ('كنافة نابلسية', (SELECT id FROM categories WHERE name = 'حلويات شرقية'),
'حضّري القطر: اغلي السكر مع الماء على نار متوسطة 10 دقائق، أضيفي الليمون وماء الزهر واتركيه يبرد.
افركي الكنافة مع السمن المذاب حتى تتشرب تماماً.
افردي نصف الكنافة في صينية دائرية مدهونة بالسمن وكبّسيها جيداً.
وزعي الجبنة النابلسية المبشورة فوقها ثم غطيها ببقية الكنافة وكبّسيها.
اخبزيها في فرن حرارته 200 درجة مئوية لمدة 30 دقيقة حتى يصبح لونها ذهبياً.
اقلبيها في صحن التقديم، اسكبي القطر البارد عليها وزيّنيها بالفستق الحلبي، وقدميها ساخنة.');

INSERT INTO ingredients (recipe_id, name, quantity)
SELECT r.id, v.name, v.quantity
FROM recipes r,
     (VALUES
       ('كنافة ناعمة مفرومة', '500 غرام'),
       ('سمن بلدي أو زبدة مذابة', '200 غرام'),
       ('جبنة نابلسية (منقوعة ومبشورة)', '500 غرام'),
       ('سكر (للقطر)', '2 كوب'),
       ('ماء (للقطر)', '1 كوب'),
       ('عصير ليمون (للقطر)', '1 ملعقة صغيرة'),
       ('ماء زهر', '1 ملعقة كبيرة'),
       ('فستق حلبي مطحون للتزيين', '3 ملاعق كبيرة')
     ) AS v(name, quantity)
WHERE r.name = 'كنافة نابلسية';

