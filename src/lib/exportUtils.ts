"use client";

import * as XLSX from "xlsx";

export function exportToCSV(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

//* Format data for export by removing unnecessary fields
export function formatDataForExport(data: any[], fieldsToRemove: string[] = ['id', 'password', 'img', 'createdAt', 'updatedAt']) {
  return data.map(item => {
    const formattedItem: any = {};
    
    for (const key in item) {
      if (!fieldsToRemove.includes(key)) {
        //* Format dates
        if (item[key] instanceof Date) {
          formattedItem[key] = item[key].toLocaleDateString();
        }
        //* Handle nested objects (like grade, class, parent, etc.)
        else if (typeof item[key] === 'object' && item[key] !== null && !Array.isArray(item[key])) {
          //* Convert nested object to string representation
          if ('name' in item[key]) {
            formattedItem[key] = item[key].name;
          } else if ('level' in item[key]) {
            formattedItem[key] = item[key].level;
          }
        }
        //* Handle arrays
        else if (Array.isArray(item[key])) {
          formattedItem[key] = item[key].map((subItem: any) => 
            typeof subItem === 'object' && subItem !== null && 'name' in subItem 
              ? subItem.name 
              : subItem
          ).join(', ');
        }
        //* Regular fields
        else {
          formattedItem[key] = item[key];
        }
      }
    }
    
    return formattedItem;
  });
}
