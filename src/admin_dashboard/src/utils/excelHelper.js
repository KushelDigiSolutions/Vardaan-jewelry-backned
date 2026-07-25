import * as XLSX from 'xlsx';

// Format products from backend to simple spreadsheet structure
export const formatProductsForExport = (products) => {
  return products.map(p => {
    // attributes formatting
    const attrsStr = (p.attributes || [])
      .map(attr => `${attr.key}:${attr.value}`)
      .join(' | ');

    // sizes formatting
    const sizesStr = (p.sizes || [])
      .map(s => `${s.size}:${s.price !== null && s.price !== undefined ? s.price : ''}:${s.inventory || 0}`)
      .join(' | ');

    // secondary images
    const mainImg = p.mainImage || (p.images && p.images[0]) || '';
    const secImgs = (p.images || [])
      .filter(img => img !== mainImg)
      .join(', ');

    // wearableMedia formatting
    const wearableMediaStr = (p.wearableMedia || [])
      .map(media => `${media.mediaType || 'image'}:${media.url}`)
      .join(' | ');

    // colorImages formatting
    const colorImagesStr = (p.colorImages || [])
      .map(ci => {
        const mediaStr = (ci.wearableMedia || [])
          .map(media => `${media.mediaType || 'image'}:${media.url}`)
          .join(',');
        return `${ci.color || ''}::${ci.mainImage || ''}::${ci.inventory || 0}::${mediaStr}`;
      })
      .join(' | ');

    return {
      SKU: p.sku || '',
      Name: p.name || '',
      Description: p.description || '',
      Price: p.price || 0,
      SalePrice: p.salePrice || 0,
      Inventory: p.inventory || 0,
      CategoryName: p.category?.name || '',
      MainImage: mainImg,
      SecondaryImages: secImgs,
      Attributes: attrsStr,
      Sizes: sizesStr,
      WearableMedia: wearableMediaStr,
      ColorImages: colorImagesStr,
      Color: p.color || '',
      IsActive: p.isActive !== false ? 'TRUE' : 'FALSE'
    };
  });
};

// Parse rows from spreadsheet into nested product structure expected by backend
export const parseImportRows = (rows) => {
  return rows.map((row, index) => {
    const sku = String(row.SKU || row.sku || '').trim();
    if (!sku) {
      throw new Error(`Row ${index + 2}: SKU is required.`);
    }

    const name = String(row.Name || row.name || '').trim();
    if (!name) {
      throw new Error(`Row ${index + 2}: Name is required.`);
    }

    const priceRaw = row.Price !== undefined ? row.Price : row.price;
    const price = Number(priceRaw);
    if (isNaN(price) || priceRaw === undefined || priceRaw === '') {
      throw new Error(`Row ${index + 2}: Price must be a valid number.`);
    }

    const salePriceRaw = row.SalePrice !== undefined ? row.SalePrice : row.saleprice || row.salePrice;
    const salePrice = salePriceRaw !== undefined && salePriceRaw !== '' ? Number(salePriceRaw) : 0;

    const inventoryRaw = row.Inventory !== undefined ? row.Inventory : row.inventory;
    const inventory = inventoryRaw !== undefined && inventoryRaw !== '' ? Number(inventoryRaw) : 0;

    const categoryName = String(row.CategoryName || row.categoryname || row.categoryName || row.Category || row.category || '').trim();

    const description = String(row.Description || row.description || '').trim();

    const mainImage = String(row.MainImage || row.mainimage || row.mainImage || '').trim();
    const secondaryImagesStr = String(row.SecondaryImages || row.secondaryimages || row.secondaryImages || '').trim();
    const images = secondaryImagesStr 
      ? secondaryImagesStr.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    if (mainImage && !images.includes(mainImage)) {
      images.unshift(mainImage);
    }

    // Attributes parsing
    const attributesStr = String(row.Attributes || row.attributes || '').trim();
    const attributes = [];
    if (attributesStr) {
      const parts = attributesStr.split('|');
      parts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex !== -1) {
          const key = part.substring(0, colonIndex).trim();
          const value = part.substring(colonIndex + 1).trim();
          if (key && value) {
            attributes.push({ key, value });
          }
        }
      });
    }

    // Sizes parsing
    const sizesStr = String(row.Sizes || row.sizes || '').trim();
    const sizes = [];
    if (sizesStr) {
      const parts = sizesStr.split('|');
      parts.forEach(part => {
        const subparts = part.split(':');
        if (subparts.length >= 1) {
          const size = subparts[0].trim();
          if (size) {
            const priceValStr = subparts[1] ? subparts[1].trim() : '';
            const sizePrice = priceValStr !== '' ? Number(priceValStr) : null;
            const inventoryValStr = subparts[2] ? subparts[2].trim() : '0';
            const sizeInventory = Number(inventoryValStr);

            sizes.push({
              size,
              price: isNaN(sizePrice) ? null : sizePrice,
              inventory: isNaN(sizeInventory) ? 0 : sizeInventory
            });
          }
        }
      });
    }

    const isActiveRaw = row.IsActive !== undefined ? row.IsActive : row.isactive || row.isActive;
    const isActive = isActiveRaw !== undefined 
      ? (String(isActiveRaw).toUpperCase() === 'TRUE' || String(isActiveRaw) === '1' || isActiveRaw === true)
      : true;

    // Wearable Media parsing
    const wearableMediaStr = String(row.WearableMedia || row.wearablemedia || row.wearableMedia || '').trim();
    const wearableMedia = [];
    if (wearableMediaStr) {
      const parts = wearableMediaStr.split('|');
      parts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex !== -1) {
          const rawMediaType = part.substring(0, colonIndex).trim().toLowerCase();
          const url = part.substring(colonIndex + 1).trim();
          if (url) {
            const mediaType = (rawMediaType === 'video' || rawMediaType === 'image') ? rawMediaType : 'image';
            wearableMedia.push({ url, mediaType });
          }
        } else {
          const url = part.trim();
          if (url) {
            const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
            wearableMedia.push({ url, mediaType: isVideo ? 'video' : 'image' });
          }
        }
      });
    }

    // Color Images / Variants parsing
    const colorImagesStr = String(
      row.ColorImages || 
      row.colorimages || 
      row.colorImages || 
      row.ColorVariants || 
      row.colorvariants || 
      row.colorVariants || 
      ''
    ).trim();
    const colorImages = [];
    if (colorImagesStr) {
      const parts = colorImagesStr.split('|');
      parts.forEach(part => {
        const subparts = part.split('::');
        if (subparts.length >= 1) {
          const color = subparts[0].trim();
          if (color) {
            const mainImage = subparts[1] ? subparts[1].trim() : '';
            const inventoryValStr = subparts[2] ? subparts[2].trim() : '0';
            const colorInventory = Number(inventoryValStr) || 0;
            
            const mediaStr = subparts[3] ? subparts[3].trim() : '';
            const colorWearableMedia = [];
            if (mediaStr) {
              const mediaParts = mediaStr.split(',');
              mediaParts.forEach(m => {
                const colonIndex = m.indexOf(':');
                if (colonIndex !== -1) {
                  const rawMediaType = m.substring(0, colonIndex).trim().toLowerCase();
                  const url = m.substring(colonIndex + 1).trim();
                  if (url) {
                    const mediaType = (rawMediaType === 'video' || rawMediaType === 'image') ? rawMediaType : 'image';
                    colorWearableMedia.push({ url, mediaType });
                  }
                } else {
                  const url = m.trim();
                  if (url) {
                    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
                    colorWearableMedia.push({ url, mediaType: isVideo ? 'video' : 'image' });
                  }
                }
              });
            }

            colorImages.push({
              color,
              mainImage,
              inventory: isNaN(colorInventory) ? 0 : colorInventory,
              wearableMedia: colorWearableMedia
            });
          }
        }
      });
    }

    const color = String(row.Color || row.color || '').trim();

    return {
      sku,
      name,
      description,
      price,
      salePrice,
      inventory,
      categoryName,
      mainImage,
      images,
      attributes,
      sizes,
      wearableMedia,
      colorImages,
      color,
      isActive
    };
  });
};

// Export to Excel file
export const exportToExcel = (formattedData, fileName = 'products_export.xlsx') => {
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
  
  // Auto-fit columns
  const maxLen = formattedData.reduce((acc, row) => {
    Object.keys(row).forEach((key, idx) => {
      const cellVal = String(row[key] || '');
      acc[idx] = Math.max(acc[idx] || 10, cellVal.length, key.length);
    });
    return acc;
  }, []);
  worksheet['!cols'] = maxLen.map(len => ({ wch: Math.min(len + 2, 50) }));

  XLSX.writeFile(workbook, fileName);
};

// Export to CSV file
export const exportToCSV = (formattedData, fileName = 'products_export.csv') => {
  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
  
  const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Download spreadsheet import template
export const downloadTemplate = (format = 'excel') => {
  const templateData = [
    {
      SKU: 'VAR-RNG-01',
      Name: 'Gold Diamond Ring',
      Description: 'A beautiful 18Kt gold diamond ring.',
      Price: 45000,
      SalePrice: 42000,
      Inventory: 25,
      CategoryName: 'Rings',
      MainImage: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e',
      SecondaryImages: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9, https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f',
      Attributes: 'Metal Type:Gold | Purity:18Kt',
      Sizes: '12:45000:10 | 14::15',
      WearableMedia: 'image:https://images.unsplash.com/photo-1573408301185-9146fe634ad0 | video:https://www.w3schools.com/html/mov_bbb.mp4',
      ColorImages: 'Red::https://images.unsplash.com/photo-1605100804763-247f67b3557e::10::image:https://images.unsplash.com/photo-1573408301185-9146fe634ad0 | Blue::https://images.unsplash.com/photo-1603561591411-07134e71a2a9::15::image:https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f',
      IsActive: 'TRUE'
    }
  ];

  if (format === 'csv') {
    exportToCSV(templateData, 'products_import_template.csv');
  } else {
    exportToExcel(templateData, 'products_import_template.xlsx');
  }
};
