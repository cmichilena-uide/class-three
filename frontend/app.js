const URL_STORE = "http://localhost:8000/productos/";

const CATEGORIES = Object.freeze([
  { key: "laptop", text: "Laptop" },
  { key: "mouse", text: "Mouse" },
  { key: "keyboard", text: "Teclado" },
  { key: "monitor", text: "Monitor" },
  { key: "headphones", text: "Audífonos" },
]);
const ALL_OPTION = Object.freeze({ key: "", text: "Todas" });

const categoryText = (key) =>
  CATEGORIES.find((c) => c.key === key)?.text ?? key;
const formatPrice = (price) => "$" + price.toFixed(2);
const stockText = (product) =>
  "Stock: " + product.stock + " | ID: " + product.id;

const productUrl = (id) => URL_STORE + id;
const productsUrl = (category) =>
  category === "" ? URL_STORE : URL_STORE + "categoria/" + category;

const emptyMessage = (category) =>
  category === ""
    ? "No hay productos todavía."
    : "No hay productos en esta categoría.";
const savedMessage = (editing, product) =>
  editing
    ? "Producto con ID " + product.id + " actualizado"
    : "Producto guardado con ID " + product.id;
const formTitle = (editingId) =>
  editingId === null
    ? "Agregar producto"
    : "Editar producto (ID " + editingId + ")";
const saveButtonText = (editingId) =>
  editingId === null ? "Guardar" : "Actualizar";

const isValidCategory = (key) => CATEGORIES.some((c) => c.key === key);
const isValidImageUrl = (text) =>
  text === "" || text.startsWith("http://") || text.startsWith("https://");

const RULES = Object.freeze([
  {
    fails: (d) => d.name === "" || d.description === "",
    message: "Complete el nombre y la descripción",
  },
  {
    fails: (d) => isNaN(d.price) || d.price <= 0,
    message: "El precio debe ser un número mayor a 0",
  },
  {
    fails: (d) => !Number.isInteger(d.stock) || d.stock < 0,
    message: "El stock debe ser un número entero positivo",
  },
  {
    fails: (d) => !isValidCategory(d.category),
    message: "Seleccione una categoría",
  },
  {
    fails: (d) => !isValidImageUrl(d.image),
    message: "La imagen debe ser una URL que empiece con http:// o https://",
  },
]);
const firstError = (data) =>
  RULES.find((rule) => rule.fails(data))?.message ?? null;

const productBody = (data) => ({
  nombre: data.name,
  descripcion: data.description,
  precio: data.price,
  stock: data.stock,
  imagen: data.image === "" ? null : data.image,
  categoria: data.category,
});

const saveRequest = (editingId, data) => ({
  url: editingId === null ? URL_STORE : productUrl(editingId),
  options: {
    method: editingId === null ? "POST" : "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(productBody(data)),
  },
});

const INITIAL_STATE = Object.freeze({ category: "", editingId: null });

const withCategory = (category) => (state) => ({ ...state, category });
const withEditing = (editingId) => (state) => ({ ...state, editingId });

const createState = (initial) => {
  const cell = { current: Object.freeze(initial) };
  return Object.freeze({
    read: () => cell.current,
    update: (transition) => {
      cell.current = Object.freeze(transition(cell.current));
    },
  });
};

const responseError = (response) =>
  new Error(
    response.status === 404 ? "Producto no encontrado" : "Datos inválidos",
  );
const readJson = (response) =>
  response.ok ? response.json() : Promise.reject(responseError(response));

const fetchProducts = (category) => fetch(productsUrl(category)).then(readJson);
const fetchProduct = (id) => fetch(productUrl(id)).then(readJson);
const removeProduct = (id) =>
  fetch(productUrl(id), { method: "DELETE" }).then(readJson);
const saveProduct = async (editingId, data) => {
  const request = saveRequest(editingId, data);
  return fetch(request.url, request.options).then(readJson);
};

const createElement = (tag, properties = {}, children = []) => {
  const element = Object.assign(document.createElement(tag), properties);
  element.append(...children);
  return element;
};

const createButton = (className, textContent, onclick) =>
  createElement("button", { type: "button", className, textContent, onclick });

const createNoImage = () =>
  createElement("div", { className: "no_image", textContent: "Sin imagen" });

const createImage = (product) =>
  createElement("img", {
    className: "product_image",
    alt: product.nombre,
    onerror: (event) => event.target.replaceWith(createNoImage()),
    src: product.imagen,
  });

const createPicture = (product) =>
  product.imagen ? createImage(product) : createNoImage();

const createCard = (actions) => (product) =>
  createElement("div", { className: "product_card" }, [
    createPicture(product),
    createElement("span", {
      className: "category_tag",
      textContent: categoryText(product.categoria),
    }),
    createElement("h3", { textContent: product.nombre }),
    createElement("p", { textContent: product.descripcion }),
    createElement("p", {
      className: "price",
      textContent: formatPrice(product.precio),
    }),
    createElement("p", { textContent: stockText(product) }),
    createElement("div", { className: "actions" }, [
      createButton("edit_button", "Editar", () => actions.onEdit(product)),
      createButton("delete_button", "Eliminar", () =>
        actions.onDelete(product.id),
      ),
    ]),
  ]);

const createChip = (active, onSelect) => (category) =>
  createButton(
    category.key === active ? "chip active" : "chip",
    category.text,
    () => onSelect(category.key),
  );

const createOption = (category) =>
  createElement("option", { value: category.key, textContent: category.text });

const dom = Object.freeze({
  products: document.getElementById("products"),
  searchResult: document.getElementById("search_result"),
  filters: document.getElementById("filters"),
  formMessage: document.getElementById("form_message"),
  searchMessage: document.getElementById("search_message"),
  productForm: document.getElementById("product_form"),
  searchForm: document.getElementById("search_form"),
  formTitle: document.getElementById("add"),
  saveButton: document.getElementById("save_button"),
  cancelButton: document.getElementById("cancel_button"),
  name: document.getElementById("name"),
  description: document.getElementById("description"),
  price: document.getElementById("price"),
  stock: document.getElementById("stock"),
  category: document.getElementById("category"),
  image: document.getElementById("image"),
  searchId: document.getElementById("search_id"),
});

const showMessage = (element, text, color) => {
  element.textContent = text;
  element.style.color = color;
};
const clearMessage = (element) => showMessage(element, "", "black");

const renderCatalog = (products, category, actions) =>
  products.length === 0
    ? dom.products.replaceChildren(emptyMessage(category))
    : dom.products.replaceChildren(...products.map(createCard(actions)));

const renderChips = (active, onSelect) =>
  dom.filters.replaceChildren(
    ...[ALL_OPTION, ...CATEGORIES].map(createChip(active, onSelect)),
  );

const renderForm = (editingId) => {
  dom.formTitle.textContent = formTitle(editingId);
  dom.saveButton.textContent = saveButtonText(editingId);
  dom.cancelButton.hidden = editingId === null;
};

const fillForm = (product) => {
  dom.name.value = product.nombre;
  dom.description.value = product.descripcion;
  dom.price.value = String(product.precio);
  dom.stock.value = String(product.stock);
  dom.category.value = product.categoria;
  dom.image.value = product.imagen ?? "";
};

const readForm = () => ({
  name: dom.name.value.trim(),
  description: dom.description.value.trim(),
  price: Number(dom.price.value),
  stock: Number(dom.stock.value),
  category: dom.category.value,
  image: dom.image.value.trim(),
});

const state = createState(INITIAL_STATE);

const loadProducts = async () => {
  const { category } = state.read();
  return fetchProducts(category)
    .then((products) => renderCatalog(products, category, actions))
    .catch(() =>
      dom.products.replaceChildren("No se pudo conectar con la API."),
    );
};

const selectCategory = (category) => {
  state.update(withCategory(category));
  renderChips(category, selectCategory);
  return loadProducts();
};

const exitEditing = () => {
  state.update(withEditing(null));
  dom.productForm.reset();
  renderForm(null);
};

const cancelEditing = () => {
  exitEditing();
  clearMessage(dom.formMessage);
};

const editProduct = (product) => {
  state.update(withEditing(product.id));
  fillForm(product);
  renderForm(product.id);
  clearMessage(dom.formMessage);
  dom.formTitle.scrollIntoView();
};

const deleteProduct = (id) =>
  confirm("¿Seguro que desea eliminar este producto?")
    ? removeProduct(id).then(() => {
        if (state.read().editingId === id) {
          exitEditing();
        }
        dom.searchResult.replaceChildren();
        return loadProducts();
      })
    : Promise.resolve();

const actions = Object.freeze({ onEdit: editProduct, onDelete: deleteProduct });

const onSaved = (editingId) => (product) => {
  showMessage(
    dom.formMessage,
    savedMessage(editingId !== null, product),
    "green",
  );
  if (editingId !== null) {
    dom.searchResult.replaceChildren();
  }
  exitEditing();
  return loadProducts();
};

const submitForm = (event) => {
  event.preventDefault();
  const data = readForm();
  const error = firstError(data);
  if (error !== null) {
    showMessage(dom.formMessage, error, "red");
    return Promise.resolve();
  }
  const { editingId } = state.read();
  return saveProduct(editingId, data)
    .then(onSaved(editingId))
    .catch((e) => showMessage(dom.formMessage, "Error: " + e.message, "red"));
};

const searchProduct = async (event) => {
  event.preventDefault();
  dom.searchResult.replaceChildren();
  clearMessage(dom.searchMessage);
  return fetchProduct(dom.searchId.value)
    .then((product) =>
      dom.searchResult.replaceChildren(createCard(actions)(product)),
    )
    .catch((e) => showMessage(dom.searchMessage, e.message, "red"));
};

const init = () => {
  dom.category.append(...CATEGORIES.map(createOption));
  renderChips(state.read().category, selectCategory);
  dom.productForm.addEventListener("submit", submitForm);
  dom.searchForm.addEventListener("submit", searchProduct);
  dom.cancelButton.addEventListener("click", cancelEditing);
  return loadProducts();
};

init();
