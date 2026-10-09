require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const pool = require('./pg');
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

const FROM = 'أإآىة';
const TO = 'اااي' + 'ه';
const normalize = (text) => text.replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').toLowerCase();


//   GET    /api/categories              return all categories

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM categories ORDER BY id');
    res.status(200).json(result.rows);
  }
  catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});


//   GET    /api/recipes?category=1&search=كنافة    return recipes (filter by category + search by name)

app.get('/api/recipes', async (req, res) => {
  const { category, search } = req.query;

  if (category !== undefined && category !== '' && !/^\d+$/.test(category))
    return res.status(400).json({ error: 'رقم النوع غير صحيح' });

  const categoryId = category ? Number(category) : null;
  // نهرب الرموز الخاصة بـ LIKE حتى يُعامل البحث كنص عادي
  const term = search && String(search).trim()
    ? normalize(String(search).trim()).replace(/[\\%_]/g, '\\$&')
    : null;

  try {
    const result = await pool.query(
      `SELECT r.id, r.name, r.category_id, c.name AS category,
              (SELECT COUNT(*) FROM ingredients i WHERE i.recipe_id = r.id)::int AS ingredients_count
       FROM recipes r
       JOIN categories c ON c.id = r.category_id
       WHERE ($1::int IS NULL OR r.category_id = $1)
         AND ($2::text IS NULL OR translate(lower(r.name), '${FROM}', '${TO}') LIKE '%' || $2 || '%')
       ORDER BY r.id`,
      [categoryId, term]
    );
    res.status(200).json(result.rows);
  }
  catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});


//   GET    /api/recipes/:id    return one recipe with its ingredients (404 if not found)

app.get('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'الرجاء إدخال رقم الوصفة كرقم' });
  try {
    const recipe = await pool.query(
      `SELECT r.id, r.name, r.category_id, c.name AS category, r.instructions
       FROM recipes r JOIN categories c ON c.id = r.category_id
       WHERE r.id = $1`, [id]);
    if (recipe.rows.length === 0) return res.status(404).json({ error: 'الوصفة غير موجودة' });

    const ingredients = await pool.query(
      'SELECT id, name, quantity FROM ingredients WHERE recipe_id = $1 ORDER BY id', [id]);

    res.status(200).json({ ...recipe.rows[0], ingredients: ingredients.rows });
  }
  catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

//   POST   /api/categories    add a category (201, 400, or 409 if it already exists)

app.post('/api/categories', async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 50)
    return res.status(400).json({ error: 'اسم النوع مطلوب (50 حرفاً كحد أقصى)' });
  try {
    const result = await pool.query('INSERT INTO categories (name) VALUES ($1) RETURNING id, name', [name]);
    res.status(201).json(result.rows[0]);
  }
  catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'هذا النوع موجود مسبقاً' });
    console.error(err.message);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});


// تنظيف والتحقق من بيانات الوصفة (يُستخدم في الإضافة والتعديل)
function validateRecipe(body) {
  body = body ?? {};
  const { category_id, ingredients } = body;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const instructions = typeof body.instructions === 'string' ? body.instructions.trim() : '';
  const cleanIngredients = Array.isArray(ingredients)
    ? ingredients
        .map(i => ({ name: String(i?.name ?? '').trim(), quantity: String(i?.quantity ?? '').trim() }))
        .filter(i => i.name || i.quantity)
    : [];

  if (!name || name.length > 100)
    return { error: 'اسم الوصفة مطلوب (100 حرف كحد أقصى)' };
  if (!/^\d+$/.test(String(category_id ?? '')))
    return { error: 'اختاري نوع الوصفة' };
  if (!instructions)
    return { error: 'طريقة التحضير مطلوبة' };
  if (cleanIngredients.length === 0)
    return { error: 'أضيفي مكوناً واحداً على الأقل' };
  if (cleanIngredients.some(i => !i.name || !i.quantity || i.name.length > 100 || i.quantity.length > 50))
    return { error: 'كل مكون يحتاج اسماً وكمية (100 و50 حرفاً كحد أقصى)' };

  return { data: { name, category_id: Number(category_id), instructions, ingredients: cleanIngredients } };
}

// أخطاء قاعدة البيانات المتوقعة عند حفظ وصفة
function handleRecipeError(err, res) {
  if (err.code === '23505') return res.status(409).json({ error: 'توجد وصفة بنفس الاسم مسبقاً' });
  if (err.code === '23503') return res.status(400).json({ error: 'النوع المختار غير موجود' });
  console.error(err.message);
  res.status(500).json({ error: 'خطأ في السيرفر' });
}


//   POST   /api/recipes    add a recipe with its ingredients (201, 400, or 409 if the name exists)

app.post('/api/recipes', async (req, res) => {
  const { error, data } = validateRecipe(req.body);
  if (error) return res.status(400).json({ error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recipe = await client.query(
      'INSERT INTO recipes (name, category_id, instructions) VALUES ($1, $2, $3) RETURNING id, name, category_id',
      [data.name, data.category_id, data.instructions]);
    for (const i of data.ingredients) {
      await client.query('INSERT INTO ingredients (recipe_id, name, quantity) VALUES ($1, $2, $3)',
        [recipe.rows[0].id, i.name, i.quantity]);
    }
    await client.query('COMMIT');
    res.status(201).json(recipe.rows[0]);
  }
  catch (err) {
    await client.query('ROLLBACK');
    handleRecipeError(err, res);
  }
  finally {
    client.release();
  }
});


//   PUT    /api/recipes/:id    update a recipe and replace its ingredients (200, 400, 404, or 409)

app.put('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'الرجاء إدخال رقم الوصفة كرقم' });

  const { error, data } = validateRecipe(req.body);
  if (error) return res.status(400).json({ error });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const recipe = await client.query(
      'UPDATE recipes SET name = $1, category_id = $2, instructions = $3 WHERE id = $4 RETURNING id, name, category_id',
      [data.name, data.category_id, data.instructions, id]);
    if (recipe.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'الوصفة غير موجودة' });
    }
    // نستبدل المكونات القديمة بالجديدة
    await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [id]);
    for (const i of data.ingredients) {
      await client.query('INSERT INTO ingredients (recipe_id, name, quantity) VALUES ($1, $2, $3)',
        [id, i.name, i.quantity]);
    }
    await client.query('COMMIT');
    res.status(200).json(recipe.rows[0]);
  }
  catch (err) {
    await client.query('ROLLBACK');
    handleRecipeError(err, res);
  }
  finally {
    client.release();
  }
});


//   DELETE /api/categories/:id    delete a category (200, 404, or 409 if it still has recipes)

app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'رقم النوع غير صحيح' });
  try {
    const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'النوع غير موجود' });
    res.status(200).json(result.rows[0]);
  }
  catch (err) {
    // 23503: ما زالت هناك وصفات من هذا النوع
    if (err.code === '23503')
      return res.status(409).json({ error: 'لا يمكن حذف نوع فيه وصفات. احذفي وصفاته أو انقليها لنوع آخر أولاً' });
    console.error(err.message);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});


//   DELETE /api/recipes/:id    delete a recipe (its ingredients are deleted too) (200 or 404)

app.delete('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'الرجاء إدخال رقم الوصفة كرقم' });
  try {
    const result = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'الوصفة غير موجودة' });
    res.status(200).json(result.rows[0]);
  }
  catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'خطأ في السيرفر' });
  }
});

// أي خطأ غير متوقع (مثل JSON غير صالح) يرجع كـ JSON
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.status === 400 ? 'بيانات غير صالحة' : 'خطأ في السيرفر' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
