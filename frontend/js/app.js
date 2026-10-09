////////////////  أدوات مساعدة  ////////////////////

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function showSpinner(show) {
    document.getElementById("loadingSpinner").classList.toggle("d-none", !show);
}

function showAlert(message) {
    const text = !message || /Failed to fetch|NetworkError/.test(message)
        ? "تعذر الاتصال بالسيرفر. تأكدي أن السيرفر يعمل."
        : message;
    document.getElementById("alertMessage").textContent = text;
    const box = document.getElementById("errorAlert");
    box.classList.remove("d-none");
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideAlert() {
    document.getElementById("errorAlert").classList.add("d-none");
}

////////////////  الحالة الحالية  ////////////////////

let selectedCategory = "";   // رقم النوع المختار ("" = الكل)
let searchText = "";
let allCategories = [];
let currentRecipe = null;     // الوصفة المعروضة حالياً في النافذة
let editingId = null;         // رقم الوصفة قيد التعديل (null = إضافة جديدة)
let requestCounter = 0;      // لتجاهل الردود القديمة إذا تغيّر الفلتر بسرعة

////////////////  عرض الأنواع (أزرار الفلترة)  ////////////////////

function renderCategories(categories) {
    const wrap = document.getElementById("categoryChips");
    const all = wrap.querySelector('[data-category=""]');
    wrap.innerHTML = "";
    wrap.appendChild(all);
    categories.forEach(c => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn chip";
        btn.dataset.category = c.id;
        btn.textContent = c.name;
        wrap.appendChild(btn);
    });
}

function markActiveChip() {
    document.querySelectorAll("#categoryChips .chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.category === String(selectedCategory));
    });
}

////////////////  عرض الوصفات  ////////////////////

function renderRecipes(recipes) {
    const grid = document.getElementById("recipesGrid");
    const empty = document.getElementById("emptyState");
    const count = document.getElementById("resultsCount");

    grid.innerHTML = recipes.map(r => `
        <div class="col">
          <article class="card recipe-card h-100 shadow-sm" role="button" tabindex="0" data-id="${r.id}"
                   aria-label="عرض وصفة ${escapeHtml(r.name)}">
            <div class="card-body d-flex flex-column">
              <span class="badge category-badge align-self-start mb-2">${escapeHtml(r.category)}</span>
              <h5 class="card-title fw-bold mb-2">${escapeHtml(r.name)}</h5>
              <p class="text-secondary small mb-3">${r.ingredients_count} مكونات</p>
              <span class="mt-auto view-link">عرض الوصفة ←</span>
            </div>
          </article>
        </div>`).join("");

    empty.classList.toggle("d-none", recipes.length !== 0);
    count.textContent = recipes.length ? `عدد الوصفات: ${recipes.length}` : "";
}

////////////////  تحميل الوصفات حسب الفلتر والبحث  ////////////////////

async function loadRecipes() {
    const myRequest = ++requestCounter;
    showSpinner(true);
    hideAlert();
    try {
        const recipes = await getRecipes(selectedCategory, searchText);
        if (myRequest !== requestCounter) return;
        renderRecipes(recipes);
    } catch (error) {
        if (myRequest !== requestCounter) return;
        document.getElementById("recipesGrid").innerHTML = "";
        document.getElementById("resultsCount").textContent = "";
        showAlert(error.message);
    } finally {
        if (myRequest === requestCounter) showSpinner(false);
    }
}

////////////////  نافذة تفاصيل الوصفة  ////////////////////

async function openRecipe(id) {
    const modalEl = document.getElementById("recipeModal");
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const body = document.getElementById("recipeModalBody");

    document.getElementById("recipeModalTitle").textContent = "";
    document.getElementById("recipeModalCategory").textContent = "";
    body.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></div>';
    currentRecipe = null;
    document.getElementById("editRecipeBtn").disabled = true;
    document.getElementById("deleteRecipeBtn").disabled = true;
    modal.show();

    try {
        const r = await getRecipeById(id);
        currentRecipe = r;
        document.getElementById("editRecipeBtn").disabled = false;
        document.getElementById("deleteRecipeBtn").disabled = false;
        document.getElementById("recipeModalTitle").textContent = r.name;
        document.getElementById("recipeModalCategory").textContent = r.category;

        const ingredients = r.ingredients.map(i => `
            <li class="list-group-item d-flex justify-content-between gap-3">
              <span>${escapeHtml(i.name)}</span>
              <span class="text-secondary text-nowrap">${escapeHtml(i.quantity)}</span>
            </li>`).join("");
        const steps = r.instructions.split("\n").filter(s => s.trim())
            .map(s => `<li class="mb-2">${escapeHtml(s)}</li>`).join("");

        body.innerHTML = `
            <h6 class="fw-bold mb-2">المكونات</h6>
            <ul class="list-group mb-4">${ingredients}</ul>
            <h6 class="fw-bold mb-2">طريقة التحضير</h6>
            <ol class="steps">${steps}</ol>`;
    } catch (error) {
        body.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(error.message || "حدث خطأ")}</div>`;
    }
}

////////////////  إضافة نوع / وصفة  ////////////////////

function showFormError(id, message) {
    const box = document.getElementById(id);
    box.textContent = !message || /Failed to fetch|NetworkError/.test(message)
        ? "تعذر الاتصال بالسيرفر." : message;
    box.classList.remove("d-none");
}

function addIngredientRow(name = "", quantity = "") {
    const row = document.createElement("div");
    row.className = "input-group ingredient-row";
    row.innerHTML = `
        <input type="text" class="form-control ing-name" placeholder="المكون (مثال: سكر)" maxlength="100" aria-label="اسم المكون">
        <input type="text" class="form-control ing-qty" placeholder="الكمية (مثال: 1 كوب)" maxlength="50" aria-label="الكمية">
        <button type="button" class="btn btn-outline-danger remove-ing" aria-label="حذف المكون">✕</button>`;
    row.querySelector(".ing-name").value = name;
    row.querySelector(".ing-qty").value = quantity;
    document.getElementById("ingredientRows").appendChild(row);
}

function openAddCategory() {
    const form = document.getElementById("categoryForm");
    form.reset();
    form.classList.remove("was-validated");
    document.getElementById("categoryFormError").classList.add("d-none");
    bootstrap.Modal.getOrCreateInstance(document.getElementById("categoryModal")).show();
}

function openRecipeForm(recipe = null) {
    editingId = recipe ? recipe.id : null;
    const form = document.getElementById("recipeForm");
    form.reset();
    form.classList.remove("was-validated");
    document.getElementById("recipeFormError").classList.add("d-none");
    document.getElementById("addRecipeModalTitle").textContent = recipe ? "تعديل الوصفة" : "إضافة وصفة جديدة";
    document.getElementById("recipeSubmitBtn").textContent = recipe ? "حفظ التعديلات" : "حفظ الوصفة";

    const select = document.getElementById("recipeCategory");
    select.innerHTML = '<option value="">اختاري...</option>' +
        allCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

    document.getElementById("ingredientRows").innerHTML = "";
    if (recipe) {
        document.getElementById("recipeName").value = recipe.name;
        select.value = recipe.category_id;
        document.getElementById("recipeInstructions").value = recipe.instructions;
        recipe.ingredients.forEach(i => addIngredientRow(i.name, i.quantity));
    } else {
        if (selectedCategory) select.value = selectedCategory;
        addIngredientRow();
        addIngredientRow();
        addIngredientRow();
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById("addRecipeModal")).show();
}

async function submitCategory(e) {
    e.preventDefault();
    const form = e.target;
    form.classList.add("was-validated");
    const input = document.getElementById("categoryName");
    if (!input.value.trim()) return;

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
        await addCategory(input.value.trim());
        bootstrap.Modal.getInstance(document.getElementById("categoryModal")).hide();
        allCategories = await getCategories();
        renderCategories(allCategories);
        markActiveChip();
        showToast("تمت إضافة النوع");
    } catch (error) {
        showFormError("categoryFormError", error.message);
    } finally {
        btn.disabled = false;
    }
}

async function submitRecipe(e) {
    e.preventDefault();
    const form = e.target;
    form.classList.add("was-validated");

    const ingredients = [...document.querySelectorAll(".ingredient-row")]
        .map(r => ({ name: r.querySelector(".ing-name").value.trim(), quantity: r.querySelector(".ing-qty").value.trim() }))
        .filter(i => i.name || i.quantity);

    const data = {
        name: document.getElementById("recipeName").value.trim(),
        category_id: document.getElementById("recipeCategory").value,
        instructions: document.getElementById("recipeInstructions").value.trim(),
        ingredients,
    };

    if (!data.name || !data.category_id || !data.instructions) return;
    if (ingredients.length === 0) return showFormError("recipeFormError", "أضيفي مكوناً واحداً على الأقل.");
    if (ingredients.some(i => !i.name || !i.quantity))
        return showFormError("recipeFormError", "كل مكون يحتاج اسماً وكمية.");

    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    try {
        const wasEditing = editingId !== null;
        if (wasEditing) await updateRecipe(editingId, data);
        else await addRecipe(data);
        bootstrap.Modal.getInstance(document.getElementById("addRecipeModal")).hide();
        await loadRecipes();
        showToast(wasEditing ? "تم حفظ التعديلات" : "تمت إضافة الوصفة");
    } catch (error) {
        showFormError("recipeFormError", error.message);
    } finally {
        btn.disabled = false;
    }
}

function showToast(message) {
    const el = document.getElementById("toastBox");
    el.textContent = message;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2500);
}

////////////////  الحذف  ////////////////////

// نافذة تأكيد عامة: ترجع true إذا ضغطت المستخدمة "نعم"
function confirmAction(message) {
    return new Promise(resolve => {
        const el = document.getElementById("confirmModal");
        const okBtn = document.getElementById("confirmOkBtn");
        document.getElementById("confirmMessage").textContent = message;
        let confirmed = false;
        const onOk = () => { confirmed = true; bootstrap.Modal.getInstance(el).hide(); };
        okBtn.addEventListener("click", onOk, { once: true });
        el.addEventListener("hidden.bs.modal", () => {
            okBtn.removeEventListener("click", onOk);
            resolve(confirmed);
        }, { once: true });
        bootstrap.Modal.getOrCreateInstance(el).show();
    });
}

async function handleDeleteRecipe() {
    if (!currentRecipe) return;
    const recipe = currentRecipe;
    const viewEl = document.getElementById("recipeModal");
    // نغلق نافذة العرض أولاً (Bootstrap لا يدعم نافذتين فوق بعض)
    await new Promise(resolve => {
        viewEl.addEventListener("hidden.bs.modal", resolve, { once: true });
        bootstrap.Modal.getInstance(viewEl).hide();
    });
    if (!await confirmAction(`هل تريدين حذف وصفة "${recipe.name}" نهائياً؟`)) return;
    try {
        await deleteRecipe(recipe.id);
        await loadRecipes();
        showToast("تم حذف الوصفة");
    } catch (error) {
        showAlert(error.message);
    }
}

function openDeleteCategory() {
    const form = document.getElementById("deleteCategoryForm");
    form.classList.remove("was-validated");
    document.getElementById("deleteCategoryError").classList.add("d-none");
    document.getElementById("deleteCategorySelect").innerHTML = '<option value="">اختاري...</option>' +
        allCategories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    bootstrap.Modal.getOrCreateInstance(document.getElementById("deleteCategoryModal")).show();
}

async function submitDeleteCategory(e) {
    e.preventDefault();
    const form = e.target;
    form.classList.add("was-validated");
    const select = document.getElementById("deleteCategorySelect");
    if (!select.value) return;
    const id = select.value;
    const name = select.selectedOptions[0].text;

    const modalEl = document.getElementById("deleteCategoryModal");
    await new Promise(resolve => {
        modalEl.addEventListener("hidden.bs.modal", resolve, { once: true });
        bootstrap.Modal.getInstance(modalEl).hide();
    });
    if (!await confirmAction(`هل تريدين حذف نوع "${name}"؟`)) return;

    try {
        await deleteCategory(id);
        if (String(selectedCategory) === id) selectedCategory = "";
        allCategories = await getCategories();
        renderCategories(allCategories);
        markActiveChip();
        await loadRecipes();
        showToast("تم حذف النوع");
    } catch (error) {
        showAlert(error.message);   // مثلاً: النوع فيه وصفات
    }
}



////////////////  الأحداث  ////////////////////

function initEvents() {
    // فلترة حسب النوع
    document.getElementById("categoryChips").addEventListener("click", (e) => {
        const chip = e.target.closest(".chip");
        if (!chip) return;
        selectedCategory = chip.dataset.category;
        markActiveChip();
        loadRecipes();
    });

    // بحث بالاسم (مع تأخير بسيط حتى لا نرسل طلباً مع كل حرف)
    let timer;
    document.getElementById("searchInput").addEventListener("input", (e) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            searchText = e.target.value.trim();
            loadRecipes();
        }, 300);
    });

    // إضافة نوع / وصفة
    document.getElementById("addCategoryBtn").addEventListener("click", openAddCategory);
    document.getElementById("addRecipeBtn").addEventListener("click", () => openRecipeForm());
    document.getElementById("editRecipeBtn").addEventListener("click", () => {
        if (!currentRecipe) return;
        const recipe = currentRecipe;
        const viewEl = document.getElementById("recipeModal");
        // نغلق نافذة العرض ثم نفتح نموذج التعديل بعد اكتمال الإغلاق
        viewEl.addEventListener("hidden.bs.modal", () => openRecipeForm(recipe), { once: true });
        bootstrap.Modal.getInstance(viewEl).hide();
    });
    document.getElementById("categoryForm").addEventListener("submit", submitCategory);
    document.getElementById("recipeForm").addEventListener("submit", submitRecipe);
    document.getElementById("addIngredientBtn").addEventListener("click", () => addIngredientRow());
    document.getElementById("ingredientRows").addEventListener("click", (e) => {
        const btn = e.target.closest(".remove-ing");
        if (!btn) return;
        const rows = document.querySelectorAll(".ingredient-row");
        if (rows.length > 1) btn.closest(".ingredient-row").remove();
    });

    // الحذف
    document.getElementById("deleteRecipeBtn").addEventListener("click", handleDeleteRecipe);
    document.getElementById("deleteCategoryBtn").addEventListener("click", openDeleteCategory);
    document.getElementById("deleteCategoryForm").addEventListener("submit", submitDeleteCategory);

    // فتح الوصفة بالضغط أو بالكيبورد
    const grid = document.getElementById("recipesGrid");
    grid.addEventListener("click", (e) => {
        const card = e.target.closest(".recipe-card");
        if (card) openRecipe(card.dataset.id);
    });
    grid.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const card = e.target.closest(".recipe-card");
        if (card) { e.preventDefault(); openRecipe(card.dataset.id); }
    });
}

////////////////  التشغيل  ////////////////////

async function init() {
    initTheme();
    initEvents();
    try {
        allCategories = await getCategories();
        renderCategories(allCategories);
    } catch (error) {
        showAlert(error.message);
    }
    loadRecipes();
}

init();
