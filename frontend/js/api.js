const API_URL = "https://dessert-recipes.onrender.com/api";

////////////////////  دالة مشتركة للطلبات  ////////////////////
async function request(path, options) {
    const response = await fetch(`${API_URL}${path}`, options);
    const result = await response.json();
    if (response.status === 200 || response.status === 201) return result;
    throw new Error(result.error || "تعذر جلب البيانات من السيرفر");
}

function sendJson(method, path, data) {
    return request(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
}

////////////////////  جلب الأنواع  ////////////////////
async function getCategories() {
    try {
        return await request("/categories");
    } catch (error) {
        console.error("Error in Get Categories:", error.message);
        throw error;
    }
}

////////////////////  إضافة نوع  ////////////////////
async function addCategory(name) {
    try {
        return await sendJson("POST", "/categories", { name });
    } catch (error) {
        console.error("Error in Add Category:", error.message);
        throw error;
    }
}

////////////////////  جلب الوصفات (فلترة + بحث)  ////////////////////
async function getRecipes(categoryId = "", search = "") {
    try {
        const params = new URLSearchParams();
        if (categoryId) params.set("category", categoryId);
        if (search) params.set("search", search);
        const query = params.toString();
        return await request(`/recipes${query ? "?" + query : ""}`);
    } catch (error) {
        console.error("Error in Get Recipes:", error.message);
        throw error;
    }
}

////////////////////  جلب وصفة واحدة مع مكوناتها  ////////////////////
async function getRecipeById(id) {
    try {
        return await request(`/recipes/${id}`);
    } catch (error) {
        console.error("Error in Get Recipe:", error.message);
        throw error;
    }
}

////////////////////  إضافة وصفة  ////////////////////
async function addRecipe(data) {
    try {
        return await sendJson("POST", "/recipes", data);
    } catch (error) {
        console.error("Error in Add Recipe:", error.message);
        throw error;
    }
}

////////////////////  تعديل وصفة  ////////////////////
async function updateRecipe(id, data) {
    try {
        return await sendJson("PUT", `/recipes/${id}`, data);
    } catch (error) {
        console.error("Error in Update Recipe:", error.message);
        throw error;
    }
}

////////////////////  حذف وصفة  ////////////////////
async function deleteRecipe(id) {
    try {
        return await request(`/recipes/${id}`, { method: "DELETE" });
    } catch (error) {
        console.error("Error in Delete Recipe:", error.message);
        throw error;
    }
}

////////////////////  حذف نوع  ////////////////////
async function deleteCategory(id) {
    try {
        return await request(`/categories/${id}`, { method: "DELETE" });
    } catch (error) {
        console.error("Error in Delete Category:", error.message);
        throw error;
    }
}
