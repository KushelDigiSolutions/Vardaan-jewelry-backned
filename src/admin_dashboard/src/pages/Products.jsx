import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Plus,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  X,
  PlusCircle,
  MinusCircle,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  formatProductsForExport,
  parseImportRows,
  exportToExcel,
  exportToCSV,
  downloadTemplate,
} from "../utils/excelHelper";
import { useToast } from "../context/ToastContext.jsx";
import { useLoader } from "../context/LoaderContext.jsx";

const Products = ({ token }) => {
  const toast = useToast();
  const { showLoader, hideLoader } = useLoader();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortOption, setSortOption] = useState("newest");
  const [activeCategoryPopupId, setActiveCategoryPopupId] = useState(null);

  // Group and sort categories hierarchically
  const categoryTree = useMemo(() => {
    const categoryMap = {};
    categories.forEach((cat) => {
      categoryMap[cat._id] = cat;
    });

    const rootCategories = [];
    const childrenMap = {};

    categories.forEach((cat) => {
      const parentId = cat.parentCategory?._id || cat.parentCategory;
      if (!parentId || !categoryMap[parentId]) {
        rootCategories.push(cat);
      } else {
        if (!childrenMap[parentId]) {
          childrenMap[parentId] = [];
        }
        childrenMap[parentId].push(cat);
      }
    });

    rootCategories.sort((a, b) => a.name.localeCompare(b.name));
    Object.keys(childrenMap).forEach((pid) => {
      childrenMap[pid].sort((a, b) => a.name.localeCompare(b.name));
    });

    return { rootCategories, childrenMap };
  }, [categories]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals/Pages state
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null); // null means adding new
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importStatus, setImportStatus] = useState("");
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    salePrice: "",
    inventory: "",
    category: "",
    categories: [],
    isActive: true,
    images: "", // Comma separated URLs
    mainImage: "",
    wearableMedia: [], // Array of {url, mediaType}
    attributes: [], // Array of {key, value}
    variants: [], // Array of variants
    sizes: [],
    colorImages: [], // Array of {color, mainImage, wearableImage}
  });
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrVal, setNewAttrVal] = useState("");
  const [newSize, setNewSize] = useState({
    size: "",
    price: "",
    inventory: "",
  });
  const [newVariant, setNewVariant] = useState({
    karat: "18Kt Gold",
    metalColor: "White Gold",
    metalType: "Gold",
    grossWeight: "",
    netWeight: "",
    size: "",
    price: "",
    salePrice: "",
    inventory: "",
  });

  // State for dynamic color variants upload
  const [tempColor, setTempColor] = useState("#000000");
  const [tempColorMainImage, setTempColorMainImage] = useState("");
  const [tempColorWearableMedia, setTempColorWearableMedia] = useState([]);
  const [colorMainImageUploading, setColorMainImageUploading] = useState(false);
  const [colorWearableMediaUploading, setColorWearableMediaUploading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = `/api/products?page=${page}&limit=10&search=${searchTerm}&category=${selectedCategory}&sort=${sortOption}&isActive=all`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products);
        setTotalPages(data.data.pagination.pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.success) setCategories(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // Instant live search — fires immediately on every keystroke
  // Blank / whitespace-only input is ignored

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, selectedCategory, sortOption]);

  useEffect(() => {
    // Don't search if input is only whitespace
    if (searchTerm !== "" && searchTerm.trim() === "") return;

    setPage(1);
    fetchProducts();
  }, [searchTerm]);

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to remove this product from the catalog?",
      )
    )
      return;
    showLoader("Removing product...");
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Product removed successfully!");
        fetchProducts();
      } else {
        toast.error(data.message || "Failed to remove product");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error removing product");
    } finally {
      hideLoader();
    }
  };

  const openAddModal = () => {
    setCurrentProduct(null);
    setFormData({
      name: "",
      sku: "",
      description: "",
      price: "",
      salePrice: "",
      inventory: "",
      category: "",
      categories: [],
      isActive: true,
      images: "",
      mainImage: "",
      wearableMedia: [],
      attributes: [],
      variants: [],
      sizes: [],
      colorImages: [],
    });
    setTempColor("#000000");
    setTempColorMainImage("");
    setTempColorWearableMedia([]);
    setIsEditing(true);
  };

  const openEditModal = (product) => {
    setCurrentProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description,
      price: product.price,
      salePrice: product.salePrice || "",
      inventory: product.inventory,
      category: product.category?._id || "",
      categories: product.categories
        ? product.categories.map((c) => (typeof c === "object" ? c._id : c))
        : product.category
          ? [product.category._id || product.category]
          : [],
      isActive: product.isActive,
      images: product.images ? product.images.join(", ") : "",
      mainImage: product.mainImage || "",
      wearableMedia: product.wearableMedia || [],
      attributes: product.attributes || [],
      variants: product.variants || [],
      sizes: product.sizes || [],
      colorImages: product.colorImages || [],
    });
    setTempColor("#000000");
    setTempColorMainImage("");
    setTempColorWearableMedia([]);
    setIsEditing(true);
  };

  const handleAddAttribute = () => {
    if (!newAttrKey || !newAttrVal) {
      toast.warning("Please fill out both Key and Value to add an attribute!");
      return;
    }
    setFormData({
      ...formData,
      attributes: [
        ...formData.attributes,
        { key: newAttrKey, value: newAttrVal },
      ],
    });
    setNewAttrKey("");
    setNewAttrVal("");
  };

  const handleRemoveAttribute = (idx) => {
    const updated = formData.attributes.filter((_, i) => i !== idx);
    setFormData({ ...formData, attributes: updated });
  };

  const handleAddVariant = () => {
    if (!newVariant.size || !newVariant.price || !newVariant.inventory) {
      toast.warning(
        "Please fill out Size, Price, and Stock level to add a variant!",
      );
      return;
    }
    const sizes = newVariant.size
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (sizes.length === 0) {
      toast.warning("Please enter a valid size or comma-separated sizes.");
      return;
    }
    const newVariantsList = sizes.map((sizeVal) => ({
      karat: newVariant.karat,
      metalColor: newVariant.metalColor,
      metalType: newVariant.metalType || "Gold",
      grossWeight: newVariant.grossWeight || "",
      netWeight: newVariant.netWeight || "",
      size: sizeVal,
      price: Number(newVariant.price),
      salePrice: newVariant.salePrice ? Number(newVariant.salePrice) : 0,
      inventory: Number(newVariant.inventory),
    }));
    setFormData({
      ...formData,
      variants: [...(formData.variants || []), ...newVariantsList],
    });
    setNewVariant({
      ...newVariant,
      size: "",
      price: "",
      salePrice: "",
      inventory: "",
      grossWeight: "",
      netWeight: "",
    });
  };

  const handleAddSize = () => {
    if (!newSize.size) {
      toast.warning("Please fill out the size field.");
      return;
    }
    const sizes = newSize.size
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (sizes.length === 0) {
      toast.warning("Please enter a valid size.");
      return;
    }
    const newSizesList = sizes.map((sizeVal) => ({
      size: sizeVal,
      price: newSize.price !== "" ? Number(newSize.price) : null,
      inventory: newSize.inventory !== "" ? Number(newSize.inventory) : 0,
    }));
    setFormData({
      ...formData,
      sizes: [...(formData.sizes || []), ...newSizesList],
    });
    setNewSize({
      size: "",
      price: "",
      inventory: "",
    });
  };

  const handleRemoveSize = (idx) => {
    const updated = (formData.sizes || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, sizes: updated });
  };

  const [mainImageUploading, setMainImageUploading] = useState(false);
  const [wearableMediaUploading, setWearableMediaUploading] = useState(false);

  const handleMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // File size validation (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `Image size must be less than 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
      return;
    }

    setMainImageUploading(true);
    showLoader("Uploading main image...");
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const res = await fetch("/api/products/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      });
      const data = await res.json();
      if (data.success && data.files && data.files.length > 0) {
        setFormData((prev) => ({
          ...prev,
          mainImage: data.files[0].url,
        }));
        toast.success("Main image uploaded successfully!");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error uploading file");
    } finally {
      setMainImageUploading(false);
      hideLoader();
    }
  };

  const handleWearableMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // File size validation (50MB limit per file)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles
        .map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`)
        .join(", ");
      toast.error(`Some files exceed 50MB limit:\n${fileNames}`);
      return;
    }

    setWearableMediaUploading(true);
    showLoader("Uploading details media...");

    try {
      const uploadPromises = files.map((file) => {
        const uploadData = new FormData();
        uploadData.append("file", file);
        return fetch("/api/products/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadData,
        }).then((res) => res.json());
      });

      const results = await Promise.all(uploadPromises);
      const newMedia = [];
      results.forEach((data) => {
        if (data.success && data.files) {
          data.files.forEach((f) => {
            newMedia.push({
              url: f.url,
              mediaType: f.mediaType,
            });
          });
        }
      });

      setFormData((prev) => ({
        ...prev,
        wearableMedia: [...(prev.wearableMedia || []), ...newMedia],
      }));
      toast.success("Media uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error uploading files");
    } finally {
      setWearableMediaUploading(false);
      hideLoader();
    }
  };

  const handleRemoveWearableMedia = (idx) => {
    setFormData((prev) => ({
      ...prev,
      wearableMedia: (prev.wearableMedia || []).filter((_, i) => i !== idx),
    }));
  };

  const handleColorMainImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `Image size must be less than 50MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
      );
      return;
    }

    setColorMainImageUploading(true);
    showLoader("Uploading color main image...");
    const uploadData = new FormData();
    uploadData.append("file", file);

    try {
      const res = await fetch("/api/products/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadData,
      });
      const data = await res.json();
      if (data.success && data.files && data.files.length > 0) {
        setTempColorMainImage(data.files[0].url);
        toast.success("Color main image uploaded successfully!");
      } else {
        toast.error(data.message || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error uploading file");
    } finally {
      setColorMainImageUploading(false);
      hideLoader();
    }
  };

  const handleColorWearableMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    const oversizedFiles = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversizedFiles.length > 0) {
      const fileNames = oversizedFiles
        .map((f) => `${f.name} (${(f.size / 1024 / 1024).toFixed(2)}MB)`)
        .join(", ");
      toast.error(`Some files exceed 50MB limit:\n${fileNames}`);
      return;
    }

    setColorWearableMediaUploading(true);
    showLoader("Uploading color wearable media...");

    try {
      const uploadPromises = files.map((file) => {
        const uploadData = new FormData();
        uploadData.append("file", file);
        return fetch("/api/products/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadData,
        }).then((res) => res.json());
      });

      const results = await Promise.all(uploadPromises);
      const newMedia = [];
      results.forEach((data) => {
        if (data.success && data.files) {
          data.files.forEach((f) => {
            newMedia.push({
              url: f.url,
              mediaType: f.mediaType,
            });
          });
        }
      });

      setTempColorWearableMedia((prev) => [...prev, ...newMedia]);
      toast.success("Media uploaded successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error uploading files");
    } finally {
      setColorWearableMediaUploading(false);
      hideLoader();
    }
  };

  const handleRemoveTempColorWearableMedia = (idx) => {
    setTempColorWearableMedia((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddColorImage = () => {
    if (!tempColor) {
      toast.warning("Please choose/enter a color first.");
      return;
    }
    if (!tempColorMainImage) {
      toast.warning("Please upload a Main Image for this color.");
      return;
    }
    if (!tempColorWearableMedia || tempColorWearableMedia.length === 0) {
      toast.warning("Please upload at least one Wearable Media item for this color.");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      colorImages: [
        ...(prev.colorImages || []),
        {
          color: tempColor,
          mainImage: tempColorMainImage,
          wearableMedia: tempColorWearableMedia,
        },
      ],
    }));

    toast.success("Color variant added successfully!");
    // Reset temp images, but keep color choice
    setTempColorMainImage("");
    setTempColorWearableMedia([]);
  };

  const handleRemoveColorImage = (idx) => {
    setFormData((prev) => ({
      ...prev,
      colorImages: (prev.colorImages || []).filter((_, i) => i !== idx),
    }));
    toast.success("Color variant removed.");
  };

  const handleRemoveVariant = (idx) => {
    const updated = (formData.variants || []).filter((_, i) => i !== idx);
    setFormData({ ...formData, variants: updated });
  };

  const [submitting, setSubmitting] = useState(false);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.categories || formData.categories.length === 0) {
      toast.warning("Please select at least one category before saving the product.");
      return;
    }
    if (!formData.mainImage) {
      toast.warning("please upload image on creating product");
      return;
    }
    setSubmitting(true);
    showLoader(
      currentProduct ? "Saving product changes..." : "Creating new product...",
    );
    try {
      const url = currentProduct
        ? `/api/products/${currentProduct._id}`
        : "/api/products";
      const method = currentProduct ? "PUT" : "POST";

      let imagesList = formData.images
        ? formData.images
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      if (formData.mainImage && !imagesList.includes(formData.mainImage)) {
        imagesList.unshift(formData.mainImage);
      }

      const payload = {
        ...formData,
        category:
          formData.categories.length > 0
            ? formData.categories[0]
            : formData.category,
        price: Number(formData.price),
        salePrice: formData.salePrice ? Number(formData.salePrice) : 0,
        inventory: Number(formData.inventory),
        images: imagesList,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        setIsEditing(false);
        fetchProducts();
        toast.success(
          currentProduct
            ? "Product updated successfully"
            : "Product created successfully",
        );
      } else {
        toast.error(data.message || "Operation failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving product");
    } finally {
      setSubmitting(false);
      hideLoader();
    }
  };

  const handleExport = async (format) => {
    setExportLoading(true);
    showLoader("Exporting product catalog...");
    try {
      const res = await fetch("/api/products/export", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data) {
        const productsList = data.data;
        const timestamp = Date.now();

        if (format === "json") {
          const dataStr =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(productsList, null, 2));
          const downloadAnchor = document.createElement("a");
          downloadAnchor.setAttribute("href", dataStr);
          downloadAnchor.setAttribute(
            "download",
            `products_export_${timestamp}.json`,
          );
          document.body.appendChild(downloadAnchor);
          downloadAnchor.click();
          downloadAnchor.remove();
        } else {
          const formatted = formatProductsForExport(productsList);
          if (format === "csv") {
            exportToCSV(formatted, `products_export_${timestamp}.csv`);
          } else {
            exportToExcel(formatted, `products_export_${timestamp}.xlsx`);
          }
        }
        toast.success("Catalog exported successfully!");
      } else {
        toast.error(
          "Failed to export catalog: " + (data.message || "Unknown error"),
        );
      }
    } catch (err) {
      console.error(err);
      toast.error("Error fetching catalog for export.");
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
      hideLoader();
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus("Reading and parsing file...");
    showLoader("Parsing and importing file...");
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(worksheet);

        if (rawRows.length === 0) {
          setImportStatus("Error: The uploaded file is empty.");
          toast.error("The uploaded file is empty.");
          hideLoader();
          return;
        }

        setImportStatus(
          `Parsed ${rawRows.length} rows. Mapping and validating...`,
        );
        const parsedProducts = parseImportRows(rawRows);

        setImportStatus(
          `Sending ${parsedProducts.length} products to the database...`,
        );
        const res = await fetch("/api/products/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ products: parsedProducts }),
        });
        const responseData = await res.json();
        if (responseData.success) {
          setImportStatus(`Success: ${responseData.message}`);
          toast.success(
            responseData.message || "Products imported successfully!",
          );
          fetchProducts();
        } else {
          setImportStatus(`Import Error: ${responseData.message}`);
          toast.error(responseData.message || "Import failed.");
        }
      } catch (err) {
        setImportStatus(`Error: ${err.message}`);
        toast.error(`Error: ${err.message}`);
      } finally {
        hideLoader();
      }
    };
    reader.onerror = () => {
      setImportStatus("Error: Failed to read the file.");
      toast.error("Failed to read the file.");
      hideLoader();
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    setImportStatus("Processing bulk import...");
    showLoader("Processing bulk import...");
    try {
      const parsed = JSON.parse(importJson);
      const res = await fetch("/api/products/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ products: parsed }),
      });
      const data = await res.json();
      if (data.success) {
        setImportStatus(data.message);
        setImportJson("");
        toast.success(data.message || "Products imported successfully!");
        fetchProducts();
      } else {
        setImportStatus(`Import Error: ${data.message}`);
        toast.error(data.message || "Import failed.");
      }
    } catch (err) {
      setImportStatus(
        `Parsing error: Invalid JSON structure. Must be a valid JSON array.`,
      );
      toast.error("Invalid JSON structure. Must be a valid JSON array.");
    } finally {
      hideLoader();
    }
  };

  if (isEditing) {
    return (
      <div className="card animate-fadeIn">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
            paddingBottom: "16px",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "var(--font-title)",
                fontSize: "24px",
                fontWeight: "700",
              }}
            >
              {currentProduct ? "Edit Product Profile" : "Add New Product"}
            </h2>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "13px",
                marginTop: "4px",
              }}
            >
              {currentProduct
                ? `Updating product details for "${formData.name}"`
                : "Create a new entry in your jewelry catalog"}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsEditing(false)}
          >
            ← Back to Products List
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div className="form-group">
              <label>Product Title Name</label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Enter product title"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>SKU Identification Code</label>
                <input
                  type="text"
                  required
                  className="form-control"
                  placeholder="e.g. VAR-SHRT-XL"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Stock quantity</label>
                <input
                  type="number"
                  required
                  className="form-control"
                  placeholder="e.g. 50"
                  value={formData.inventory}
                  onChange={(e) =>
                    setFormData({ ...formData, inventory: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>Product Description</label>
              <textarea
                required
                rows={3}
                className="form-control"
                placeholder="Provide details about features, specifications..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Base Price (₹)</label>
                <input
                  type="number"
                  required
                  className="form-control"
                  placeholder="999"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Sale Price (₹)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="899 (Optional)"
                  value={formData.salePrice}
                  onChange={(e) =>
                    setFormData({ ...formData, salePrice: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label
                style={{
                  fontWeight: "600",
                  color: "var(--text-color)",
                  marginBottom: "8px",
                  display: "block",
                }}
              >
                Category Assignment (Multiple Selection)
              </label>
              <div
                style={{ display: "flex", gap: "8px", marginBottom: "10px" }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      categories: categories.map((c) => c._id),
                    }));
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    height: "auto",
                    minHeight: "unset",
                    width: "auto",
                  }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      categories: [],
                    }));
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: "12px",
                    height: "auto",
                    minHeight: "unset",
                    width: "auto",
                  }}
                >
                  Deselect All
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  padding: "16px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  maxHeight: "300px",
                  overflowY: "auto",
                  backgroundColor: "rgba(0,0,0,0.01)",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
                }}
              >
                {categoryTree.rootCategories.map((parent) => {
                  const isParentChecked = (formData.categories || []).includes(
                    parent._id,
                  );
                  const children = categoryTree.childrenMap[parent._id] || [];
                  return (
                    <div
                      key={parent._id}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {/* Parent Category Row */}
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          cursor: "pointer",
                          margin: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isParentChecked}
                          onChange={(e) => {
                            const updated = e.target.checked
                              ? [...(formData.categories || []), parent._id]
                              : (formData.categories || []).filter(
                                  (id) => id !== parent._id,
                                );
                            setFormData((prev) => ({
                              ...prev,
                              categories: updated,
                            }));
                          }}
                          style={{
                            cursor: "pointer",
                            width: "18px",
                            height: "18px",
                            accentColor: "#07512E",
                          }}
                        />
                        <span
                          style={{
                            fontWeight: "600",
                            fontSize: "15px",
                            color: "var(--text-color)",
                          }}
                        >
                          {parent.name}
                        </span>
                      </label>
                      {/* Child Categories (Indented) */}
                      {children.length > 0 && (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill, minmax(180px, 1fr))",
                            gap: "8px",
                            paddingLeft: "24px",
                            borderLeft: "2px solid rgba(7, 81, 46, 0.15)",
                            marginLeft: "8px",
                          }}
                        >
                          {children.map((child) => {
                            const isChildChecked = (
                              formData.categories || []
                            ).includes(child._id);
                            return (
                              <label
                                key={child._id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  color: "var(--text-color)",
                                  fontWeight: "normal",
                                  margin: 0,
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChildChecked}
                                  onChange={(e) => {
                                    const updated = e.target.checked
                                      ? [
                                          ...(formData.categories || []),
                                          child._id,
                                        ]
                                      : (formData.categories || []).filter(
                                          (id) => id !== child._id,
                                        );
                                    setFormData((prev) => ({
                                      ...prev,
                                      categories: updated,
                                    }));
                                  }}
                                  style={{
                                    cursor: "pointer",
                                    width: "15px",
                                    height: "15px",
                                    accentColor: "#07512E",
                                  }}
                                />
                                <span>{child.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="form-group">
              <label>Listing Status</label>
              <select
                className="form-control"
                value={formData.isActive ? "true" : "false"}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    isActive: e.target.value === "true",
                  })
                }
              >
                <option value="true">Active Listing</option>
                <option value="false">Hidden / Inactive</option>
              </select>
            </div>

            {/* Main Product Image Upload Section */}
            <div
              className="form-group"
              style={{
                border: "1px dashed var(--border-color)",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "rgba(0,0,0,0.01)",
              }}
            >
              <label style={{ fontWeight: "bold" }}>
                Main Product Image{" "}
                <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  margin: "2px 0 10px 0",
                }}
              >
                This is the close-up product image displayed as the primary
                thumbnail.
              </p>

              <div
                style={{ display: "flex", alignItems: "center", gap: "16px" }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleMainImageUpload}
                  style={{ display: "none" }}
                  id="main-image-upload-input"
                />
                <label
                  htmlFor="main-image-upload-input"
                  className="btn btn-secondary"
                  style={{
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <PlusCircle size={16} />
                  {mainImageUploading ? "Uploading..." : "Choose Main Image"}
                </label>

                {formData.mainImage && (
                  <div
                    style={{
                      position: "relative",
                      width: "80px",
                      height: "80px",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={formData.mainImage}
                      alt="Main Product Preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, mainImage: "" })
                      }
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        background: "rgba(220, 38, 38, 0.8)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "10px",
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Wearable Media / Secondary Images & Videos Upload Section */}
            <div
              className="form-group"
              style={{
                border: "1px dashed var(--border-color)",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "rgba(0,0,0,0.01)",
              }}
            >
              <label style={{ fontWeight: "bold" }}>
                Wearable & Detail Media (Images & Videos)
              </label>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  margin: "2px 0 10px 0",
                }}
              >
                Upload images or videos showing someone wearing the product, or
                other details.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleWearableMediaUpload}
                    style={{ display: "none" }}
                    id="wearable-media-upload-input"
                  />
                  <label
                    htmlFor="wearable-media-upload-input"
                    className="btn btn-secondary"
                    style={{
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <PlusCircle size={16} />
                    {wearableMediaUploading
                      ? "Uploading..."
                      : "Choose Images/Videos"}
                  </label>
                </div>

                {formData.wearableMedia &&
                  formData.wearableMedia.length > 0 && (
                    <div
                      style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}
                    >
                      {formData.wearableMedia.map((media, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            width: "80px",
                            height: "80px",
                            border: "1px solid var(--border-color)",
                            borderRadius: "8px",
                            overflow: "hidden",
                            backgroundColor: "#000",
                          }}
                        >
                          {media.mediaType === "video" ? (
                            <video
                              src={media.url}
                              muted
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <img
                              src={media.url}
                              alt={`Preview ${idx}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          )}

                          <div
                            style={{
                              position: "absolute",
                              bottom: "2px",
                              left: "4px",
                              fontSize: "9px",
                              backgroundColor: "rgba(0,0,0,0.6)",
                              color: "white",
                              padding: "1px 4px",
                              borderRadius: "4px",
                            }}
                          >
                            {media.mediaType}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveWearableMedia(idx)}
                            style={{
                              position: "absolute",
                              top: "4px",
                              right: "4px",
                              background: "rgba(220, 38, 38, 0.8)",
                              color: "white",
                              border: "none",
                              borderRadius: "50%",
                              width: "18px",
                              height: "18px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              fontSize: "10px",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            {/* Color Pick & Image Upload Section */}
            <div
              className="form-group"
              style={{
                border: "1px dashed var(--border-color)",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "rgba(0,0,0,0.01)",
              }}
            >
              <label style={{ fontWeight: "bold" }}>
                Color-Wise Images (Variants)
              </label>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  margin: "2px 0 10px 0",
                }}
              >
                Choose a color from the picker or type hex code, upload its respective main image & wearable image, and add it.
              </p>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  backgroundColor: "rgba(0,0,0,0.02)",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  marginBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <label style={{ fontSize: "12px", fontWeight: "600" }}>Color:</label>
                    <input
                      type="color"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      style={{
                        width: "36px",
                        height: "36px",
                        padding: "0",
                        border: "1px solid var(--border-color)",
                        borderRadius: "4px",
                        cursor: "pointer",
                      }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={tempColor}
                      onChange={(e) => setTempColor(e.target.value)}
                      placeholder="#000000"
                      style={{ width: "95px", padding: "4px 8px", height: "36px" }}
                    />
                  </div>

                  {/* Main Image Upload */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="file"
                      accept="image/*"
                      id="color-main-upload"
                      style={{ display: "none" }}
                      onChange={handleColorMainImageUpload}
                    />
                    <label
                      htmlFor="color-main-upload"
                      className="btn btn-secondary"
                      style={{
                        cursor: "pointer",
                        height: "36px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "0 12px",
                        fontSize: "12px",
                      }}
                    >
                      {colorMainImageUploading ? "Uploading..." : "Upload Main Image"}
                    </label>
                    {tempColorMainImage && (
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "4px",
                          overflow: "hidden",
                          border: "1px solid var(--border-color)",
                          position: "relative"
                        }}
                      >
                        <img src={tempColorMainImage} alt="Main" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button
                          type="button"
                          onClick={() => setTempColorMainImage("")}
                          style={{
                            position: "absolute", top: "0", right: "0", background: "red", color: "white", border: "none", width: "14px", height: "14px", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                                   {/* Wearable Media Upload (Multiple Files) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", borderLeft: "1px solid var(--border-color)", paddingLeft: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <input
                        type="file"
                        accept="image/*,video/*"
                        multiple
                        id="color-wearable-upload"
                        style={{ display: "none" }}
                        onChange={handleColorWearableMediaUpload}
                      />
                      <label
                        htmlFor="color-wearable-upload"
                        className="btn btn-secondary"
                        style={{
                          cursor: "pointer",
                          height: "36px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "0 12px",
                          fontSize: "12px",
                        }}
                      >
                        {colorWearableMediaUploading ? "Uploading..." : "Upload Wearable Media"}
                      </label>
                    </div>
                    {/* Previews of tempColorWearableMedia */}
                    {tempColorWearableMedia && tempColorWearableMedia.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                        {tempColorWearableMedia.map((media, idx) => (
                          <div
                            key={idx}
                            style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "4px",
                              overflow: "hidden",
                              border: "1px solid var(--border-color)",
                              position: "relative",
                              backgroundColor: "#000"
                            }}
                          >
                            {media.mediaType === "video" ? (
                              <video src={media.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <img src={media.url} alt="Wearable Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveTempColorWearableMedia(idx)}
                              style={{
                                position: "absolute", top: "0", right: "0", background: "rgba(220, 38, 38, 0.8)", color: "white", border: "none", width: "12px", height: "12px", fontSize: "8px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", borderRadius: "50%"
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
 
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddColorImage}
                    style={{
                      height: "36px",
                      padding: "0 16px",
                      fontSize: "12px",
                      backgroundColor: "var(--primary-color, #07512E)",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Add Color
                  </button>
                </div>
              </div>
 
              {/* List of colorImages currently added */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {(formData.colorImages || []).map((ci, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      backgroundColor: "white",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          backgroundColor: ci.color,
                          border: "1px solid #ccc",
                          display: "inline-block"
                        }}
                        title={ci.color}
                      />
                      <span style={{ fontSize: "13px", fontFamily: "monospace" }}>{ci.color}</span>
                    </div>
 
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>Main Image</span>
                        <img src={ci.mainImage} alt="Main" style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px", border: "1px solid #eee" }} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", maxWidth: "160px" }}>
                        <span style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "2px" }}>Wearable Media</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
                          {(ci.wearableMedia || []).map((media, mIdx) => (
                            <div
                              key={mIdx}
                              style={{
                                width: "32px",
                                height: "32px",
                                border: "1px solid #eee",
                                borderRadius: "4px",
                                overflow: "hidden",
                                backgroundColor: "#000",
                                position: "relative"
                              }}
                            >
                              {media.mediaType === "video" ? (
                                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "8px" }}>🎬</div>
                              ) : (
                                <img src={media.url} alt={`Wearable ${mIdx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveColorImage(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "red",
                          cursor: "pointer",
                          fontSize: "14px",
                          fontWeight: "bold"
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>      </div>

            {/* <div className="form-group">
              <label>Fallback Media Image URLs (comma separated)</label>
              <input
                type="text"
                className="form-control"
                placeholder="https://image1.jpg, https://image2.jpg"
                value={formData.images}
                onChange={(e) => setFormData({ ...formData, images: e.target.value })}
              />
            </div> */}

            {/* Attributes Section */}
            <div className="form-group">
              <label>Dynamic Product Attributes</label>
              <div
                style={{ display: "flex", gap: "8px", marginBottom: "10px" }}
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="Key ex- Metal"
                  value={newAttrKey}
                  onChange={(e) => setNewAttrKey(e.target.value)}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Value (e.g. brass)"
                  value={newAttrVal}
                  onChange={(e) => setNewAttrVal(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddAttribute}
                  style={{ padding: "12px" }}
                >
                  <PlusCircle size={18} />
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {formData.attributes.map((attr, idx) => (
                  <span
                    key={idx}
                    className="badge badge-info"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                    }}
                  >
                    {attr.key}: {attr.value}
                    <MinusCircle
                      size={12}
                      style={{ cursor: "pointer", color: "var(--danger)" }}
                      onClick={() => handleRemoveAttribute(idx)}
                    />
                  </span>
                ))}
              </div>
            </div>

            {/* Sizes & Custom Price Section */}
            <div
              className="form-group"
              style={{
                borderTop: "1px solid var(--border-color)",
                paddingTop: "15px",
              }}
            >
              <label style={{ fontWeight: "bold" }}>
                Product Sizes & Custom Pricing
              </label>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  margin: "4px 0 12px 0",
                }}
              >
                Specify sizes, optional custom prices, and per-size stock
                quantity. Leave price blank to use the base product price. Leave
                stock blank for unlimited (uses main stock).
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginBottom: "10px",
                  flexWrap: "wrap",
                }}
              >
                <input
                  type="text"
                  className="form-control"
                  placeholder="Size (e.g. XL, 14, 16)"
                  value={newSize.size}
                  onChange={(e) =>
                    setNewSize({ ...newSize, size: e.target.value })
                  }
                  style={{ minWidth: "120px", flex: "1" }}
                />
                <input
                  type="number"
                  className="form-control"
                  placeholder="Price (₹) - Optional"
                  value={newSize.price}
                  onChange={(e) =>
                    setNewSize({ ...newSize, price: e.target.value })
                  }
                  style={{ minWidth: "120px", flex: "1" }}
                />
                <input
                  type="number"
                  className="form-control"
                  placeholder="Qty / Stock (e.g. 10)"
                  value={newSize.inventory}
                  onChange={(e) =>
                    setNewSize({ ...newSize, inventory: e.target.value })
                  }
                  style={{ minWidth: "120px", flex: "1" }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleAddSize}
                  style={{ padding: "12px" }}
                >
                  Add Size
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {formData.sizes &&
                  formData.sizes.map((s, idx) => (
                    <span
                      key={idx}
                      className="badge badge-info"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        backgroundColor: "rgba(7, 81, 46, 0.1)",
                        border: "1px solid rgba(7, 81, 46, 0.2)",
                        color: "var(--text-dark)",
                      }}
                    >
                      Size: <strong>{s.size}</strong>
                      {s.price ? ` ₹${s.price}` : " (Default Price)"}
                      {" | Stock: "}
                      <strong
                        style={{
                          color:
                            s.inventory > 0
                              ? "var(--success)"
                              : "var(--danger)",
                        }}
                      >
                        {s.inventory > 0 ? s.inventory : "∞"}
                      </strong>
                      <MinusCircle
                        size={14}
                        style={{ cursor: "pointer", color: "var(--danger)" }}
                        onClick={() => handleRemoveSize(idx)}
                      />
                    </span>
                  ))}
              </div>
            </div>

            {/* Variants Section */}
            {/* <div className="form-group" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
              <label style={{ fontWeight: 'bold' }}>Product Variant Options & Custom Pricing</label>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
                Configure specific metal color, karat purity, size, and individual price adjustments.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Karat</label>
                  <select
                    className="form-control"
                    value={newVariant.karat}
                    onChange={(e) => setNewVariant({ ...newVariant, karat: e.target.value })}
                  >
                    <option value="18Kt Gold">18Kt Gold</option>
                    <option value="22Kt Gold">22Kt Gold</option>
                    <option value="24Kt Gold">24Kt Gold</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Metal Color</label>
                  <select
                    className="form-control"
                    value={newVariant.metalColor}
                    onChange={(e) => setNewVariant({ ...newVariant, metalColor: e.target.value })}
                  >
                    <option value="White Gold">White Gold</option>
                    <option value="Yellow Gold">Yellow Gold</option>
                    <option value="Rose Gold">Rose Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Metal Type</label>
                  <select
                    className="form-control"
                    value={newVariant.metalType}
                    onChange={(e) => setNewVariant({ ...newVariant, metalType: e.target.value })}
                  >
                    <option value="Gold">Gold</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Silver">Silver</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Gross Weight</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 24.50 grams"
                    value={newVariant.grossWeight}
                    onChange={(e) => setNewVariant({ ...newVariant, grossWeight: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Net Weight</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 21.00 grams"
                    value={newVariant.netWeight}
                    onChange={(e) => setNewVariant({ ...newVariant, netWeight: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Size (e.g. 12, 14)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Size"
                    value={newVariant.size}
                    onChange={(e) => setNewVariant({ ...newVariant, size: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Price (₹)</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Price"
                    value={newVariant.price}
                    onChange={(e) => setNewVariant({ ...newVariant, price: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Sale Price</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Sale"
                    value={newVariant.salePrice}
                    onChange={(e) => setNewVariant({ ...newVariant, salePrice: e.target.value })}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '500' }}>Stock Level</label>
                  <input
                    type="number"
                    className="form-control"
                    placeholder="Stock"
                    value={newVariant.inventory}
                    onChange={(e) => setNewVariant({ ...newVariant, inventory: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddVariant}
                style={{ marginBottom: '12px', fontSize: '12px', padding: '6px 12px' }}
              >
                Add Variant Combos
              </button>

              <div style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <table className="custom-table" style={{ fontSize: '11px', margin: 0 }}>
                  <thead>
                    <tr>
                      <th>Karat</th>
                      <th>Color</th>
                      <th>Metal Type</th>
                      <th>Gross Wt</th>
                      <th>Net Wt</th>
                      <th>Size</th>
                      <th>Price</th>
                      <th>Sale Price</th>
                      <th>Stock</th>
                      <th style={{ textAlign: 'right' }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.variants && formData.variants.length > 0 ? (
                      formData.variants.map((v, idx) => (
                        <tr key={idx}>
                          <td>{v.karat}</td>
                          <td>{v.metalColor}</td>
                          <td>{v.metalType || 'Gold'}</td>
                          <td>{v.grossWeight || '-'}</td>
                          <td>{v.netWeight || '-'}</td>
                          <td>{v.size}</td>
                          <td style={{ fontWeight: '500' }}>₹{v.price.toLocaleString('en-IN')}</td>
                          <td style={{ fontWeight: '500' }}>{v.salePrice > 0 ? `₹${v.salePrice.toLocaleString('en-IN')}` : '-'}</td>
                          <td>{v.inventory} units</td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-danger"
                              style={{ padding: '3px' }}
                              onClick={() => handleRemoveVariant(idx)}
                            >
                              <MinusCircle size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
                          No variants configured. Product will sell at base price.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div> */}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "30px",
              paddingBefore: "16px",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditing(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                submitting || mainImageUploading || wearableMediaUploading
              }
              className="btn btn-primary"
            >
              {submitting
                ? "Saving..."
                : currentProduct
                  ? "Save Adjustments"
                  : "Add to Catalog"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {/* Search and Filters Toolbar */}
      <div className="toolbar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-control"
            placeholder="Search by product name, SKU or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filters-wrapper">
          <select
            style={{ cursor: "pointer" }}
            className="form-control "
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categoryTree.rootCategories.map((parent) => (
              <React.Fragment key={parent._id}>
                <option value={parent._id}>{parent.name}</option>
                {(categoryTree.childrenMap[parent._id] || []).map((child) => (
                  <option key={child._id} value={child._id}>
                    &nbsp;&nbsp;— {child.name}
                  </option>
                ))}
              </React.Fragment>
            ))}
          </select>

          <select
            style={{ cursor: "pointer" }}
            className="form-control "
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setPage(1);
            }}
          >
            <option value="newest">Sort: Newest</option>
            <option value="price_asc">Sort: Price Low to High</option>
            <option value="price_desc">Sort: Price High to Low</option>
          </select>

          <button
            className="btn btn-secondary"
            onClick={() => setShowExportModal(true)}
            title="Export Catalog to Excel, CSV, or JSON"
          >
            <Download size={16} /> Export
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => setShowImportModal(true)}
            title="Bulk Import via Excel, CSV, or JSON"
          >
            <FileSpreadsheet size={16} /> Import
          </button>

          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="card" style={{ padding: "0px" }}>
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name / SKU</th>
                <th>Category</th>
                <th>Base Price</th>
                <th>Sale Price</th>
                <th>Stock Level</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Loading products list...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: "center",
                      padding: "40px",
                      color: "var(--text-muted)",
                    }}
                  >
                    No products matching filter criteria found.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <img
                        src={
                          p.images[0] ||
                          "https://images.unsplash.com/photo-1523275335684-37898b6baf30"
                        }
                        alt={p.name}
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          border: "1px solid var(--border-color)",
                        }}
                      />
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: "600" }}>{p.name}</span>
                        <span
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                          }}
                        >
                          SKU: {p.sku}
                        </span>
                      </div>
                    </td>
                    <td>
                      {(() => {
                        const cats = p.categories || [];
                        if (cats.length === 0) {
                          return (
                            <span className="badge text-black bg-gray-300">
                              {p.category?.name || "Unassigned"}
                            </span>
                          );
                        }

                        const firstCatName =
                          cats[0]?.name || p.category?.name || "Unassigned";
                        if (cats.length <= 1) {
                          return (
                            <span className="badge text-black bg-gray-300">
                              {firstCatName}
                            </span>
                          );
                        }

                        const remainingCount = cats.length - 1;
                        const isOpen = activeCategoryPopupId === p._id;

                        return (
                          <div
                            style={{
                              position: "relative",
                              display: "inline-block",
                            }}
                          >
                            <span
                              className="badge text-black bg-gray-300"
                              style={{
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                userSelect: "none",
                              }}
                              onClick={() => setActiveCategoryPopupId(p._id)}
                            >
                              {firstCatName}{" "}
                              <span
                                style={{ color: "#07512E", fontWeight: "bold" }}
                              >
                                + {remainingCount} more
                              </span>
                            </span>
                            {isOpen && (
                              <>
                                <div
                                  style={{
                                    position: "fixed",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    zIndex: 99,
                                    background: "transparent",
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveCategoryPopupId(null);
                                  }}
                                />
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: "0",
                                    zIndex: 100,
                                    backgroundColor: "#ffffff",
                                    border: "1px solid var(--border-color)",
                                    borderRadius: "8px",
                                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                    padding: "12px",
                                    minWidth: "200px",
                                    marginTop: "6px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                    textAlign: "left",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      borderBottom:
                                        "1px solid var(--border-color)",
                                      paddingBottom: "6px",
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: "bold",
                                        fontSize: "12px",
                                        color: "var(--text-color)",
                                      }}
                                    >
                                      All Categories
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveCategoryPopupId(null);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--text-muted)",
                                        cursor: "pointer",
                                        fontSize: "16px",
                                        fontWeight: "bold",
                                        padding: "0 4px",
                                        lineHeight: 1,
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "6px",
                                      maxHeight: "150px",
                                      overflowY: "auto",
                                    }}
                                  >
                                    {cats.map((cat, idx) => (
                                      <span
                                        key={cat._id || idx}
                                        style={{
                                          fontSize: "12px",
                                          color: "var(--text-color)",
                                          display: "block",
                                        }}
                                      >
                                        • {cat.name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td style={{ fontWeight: "500" }}>
                      ₹{p.price.toLocaleString("en-IN")}
                    </td>
                    <td
                      style={{
                        fontWeight: "500",
                        color: p.salePrice > 0 ? "#10b981" : "var(--text-dark)",
                      }}
                    >
                      {p.salePrice > 0
                        ? `₹${p.salePrice.toLocaleString("en-IN")}`
                        : "-"}
                    </td>
                    <td>
                      <span
                        className={`badge badge-${p.inventory <= 10 ? "danger" : "success"}`}
                        style={{ fontWeight: "bold" }}
                      >
                        {p.inventory} units
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${p.isActive ? "success" : "danger"}`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "8px" }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => openEditModal(p)}
                          style={{ padding: "6px" }}
                          title="Edit Product"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-secondary btn-danger"
                          onClick={() => handleDelete(p._id)}
                          style={{ padding: "6px" }}
                          title="Delete Product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "8px",
              padding: "16px",
              borderTop: "1px solid var(--border-color)",
            }}
          >
            <button
              className="btn btn-secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              style={{ padding: "6px 12px" }}
            >
              Prev
            </button>
            <span
              style={{
                alignSelf: "center",
                fontSize: "13px",
                color: "var(--text-muted)",
              }}
            >
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary"
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              style={{ padding: "6px 12px" }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showImportModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "600px" }}>
            <div className="modal-header">
              <h2>Bulk Import Products</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatus("");
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="modal-body"
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {/* Template Download Section */}
              <div
                style={{
                  padding: "12px",
                  border: "1px dashed var(--border-color)",
                  borderRadius: "8px",
                  backgroundColor: "rgba(0,0,0,0.01)",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Download Spreadsheet Template
                </h4>
                <p
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  Use these pre-formatted templates to structure your product
                  details correctly before importing.
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => downloadTemplate("excel")}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    Download Excel Template (.xlsx)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => downloadTemplate("csv")}
                    style={{ fontSize: "12px", padding: "6px 12px" }}
                  >
                    Download CSV Template (.csv)
                  </button>
                </div>
              </div>

              {/* File Uploader Section */}
              <div>
                <h4
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Upload Excel / CSV File
                </h4>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileImport}
                  className="form-control"
                  style={{ padding: "8px", cursor: "pointer" }}
                />
              </div>

              {/* Collapsible/Fallback Raw JSON paste section */}
              <details
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "10px",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                    color: "var(--text-muted)",
                  }}
                >
                  Alternative: Paste JSON Array directly
                </summary>
                <form
                  onSubmit={handleBulkImport}
                  style={{
                    marginTop: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  <div className="form-group">
                    <textarea
                      rows={6}
                      required
                      className="form-control"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "12px",
                        margin: 0,
                      }}
                      placeholder={`[\n  {\n    "name": "Cool Sunglasses",\n    "sku": "ACC-SUN-01",\n    "price": 1499,\n    "inventory": 80,\n    "categoryName": "Electronics"\n  }\n]`}
                      value={importJson}
                      onChange={(e) => setImportJson(e.target.value)}
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ alignSelf: "flex-end" }}
                  >
                    Process JSON Import
                  </button>
                </form>
              </details>

              {importStatus && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "var(--secondary)",
                    backgroundColor: "rgba(0,0,0,0.05)",
                    padding: "12px",
                    borderRadius: "8px",
                    borderLeft: "3px solid var(--primary)",
                    whiteSpace: "pre-wrap",
                    maxHeight: "150px",
                    overflowY: "auto",
                  }}
                >
                  <strong>Status Log:</strong>
                  <div style={{ marginTop: "4px" }}>{importStatus}</div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatus("");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Export Modal */}
      {showExportModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h2>Export Product Catalog</h2>
              <button
                className="modal-close"
                onClick={() => setShowExportModal(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div
              className="modal-body"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                padding: "20px 0",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  margin: 0,
                  textAlign: "center",
                }}
              >
                Select the format in which you want to export your entire
                jewelry product catalog.
              </p>

              {exportLoading ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "var(--text-muted)",
                  }}
                >
                  Exporting catalog data, please wait...
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleExport("excel")}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FileSpreadsheet size={18} /> Export as Excel Sheet (.xlsx)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleExport("csv")}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FileText size={18} /> Export as CSV File (.csv)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleExport("json")}
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Download size={18} /> Export as JSON Document (.json)
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowExportModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
