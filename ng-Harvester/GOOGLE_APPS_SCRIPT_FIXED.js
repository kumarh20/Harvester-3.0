// ✅ Shared response helper
function outputJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ✅ Handle OPTIONS (CORS Preflight)
function doOptions(e) {
  return ContentService.createTextOutput("ok")
    .setMimeType(ContentService.MimeType.TEXT);
}

// ✅ GET — Fetch records by deviceId
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const deviceId = e.parameter.deviceId;
  if (!deviceId) return outputJSON({ error: "Missing deviceId" });

  const sheet = ss.getSheetByName(deviceId);
  if (!sheet) return outputJSON([]);

  const data = sheet.getDataRange().getValues();
  if (data.length === 0) return outputJSON([]);
  
  const headers = data.shift();
  const rows = data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  return outputJSON(rows);
}

// ✅ POST — Add OR Simulated DELETE/PUT
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const method = data._method || "POST"; // If simulated method like DELETE or PUT
  const deviceId = data.deviceId;

  // ✅ Handle DELETE (via POST with _method: 'DELETE')
  if (method === "DELETE") {
    if (!deviceId || !data.id) return outputJSON({ error: "Missing deviceId or id" });

    const sheet = ss.getSheetByName(deviceId);
    if (!sheet) return outputJSON({ error: "Sheet not found" });

    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.id.toString()) {
        sheet.deleteRow(i + 1);
        return outputJSON({ success: true });
      }
    }
    return outputJSON({ error: "ID not found" });
  }

  // ✅ Handle PUT (via POST with _method: 'PUT')
  if (method === "PUT") {
    if (!deviceId || !data.id) return outputJSON({ error: "Missing deviceId or id" });

    const sheet = ss.getSheetByName(deviceId);
    if (!sheet) return outputJSON({ error: "Sheet not found" });

    const rows = sheet.getDataRange().getValues();
    const headers = rows[0];

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0].toString() === data.id.toString()) {
        // ✅ Map Angular field names to sheet columns (convert strings to numbers)
        sheet.getRange(i + 1, 2, 1, headers.length - 1).setValues([[
          data.farmerName || "",
          data.contactNumber || "",
          data.date || "",
          parseFloat(data.landInAcres) || 0,
          parseFloat(data.ratePerAcre) || 0,
          parseFloat(data.totalPayment) || 0,
          parseFloat(data.paidOnSight) || 0,
          data.fullPaymentDate || ""
        ]]);
        return outputJSON({ success: true });
      }
    }
    return outputJSON({ error: "ID not found" });
  }

  // ✅ Normal Add Logic - Using English column names from Angular
  if (!deviceId) return outputJSON({ error: "Missing deviceId" });

  let sheet = ss.getSheetByName(deviceId);
  const expectedHeaders = ["id", "farmerName", "contactNumber", "date", "landInAcres", "ratePerAcre", "totalPayment", "paidOnSight", "fullPaymentDate"];
  
  if (!sheet) {
    // Create new sheet with correct headers
    sheet = ss.insertSheet(deviceId);
    sheet.appendRow(expectedHeaders);
  } else {
    // Check if headers are correct, if not, update them
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const headersMatch = expectedHeaders.every((h, i) => existingHeaders[i] === h);
    
    if (!headersMatch || existingHeaders.length !== expectedHeaders.length) {
      // Update headers to match expected format
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    }
  }

  const id = Date.now().toString();
  
  // ✅ Map Angular field names to sheet columns (convert strings to numbers)
  // Ensure we're using the correct data from the payload
  const rowData = [
    id,
    data.farmerName || "",
    data.contactNumber || "",
    data.date || "",
    parseFloat(data.landInAcres) || 0,
    parseFloat(data.ratePerAcre) || 0,
    parseFloat(data.totalPayment) || 0,
    parseFloat(data.paidOnSight) || 0,
    data.fullPaymentDate || ""
  ];
  
  // Log for debugging (remove in production)
  console.log("Appending row with data:", rowData);
  console.log("Payload received:", data);
  
  sheet.appendRow(rowData);

  return outputJSON({ success: true, id });
}

// ✅ PUT — Update record (handled in doPost with _method: 'PUT')
// This function is kept for direct PUT requests if needed
function doPut(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const data = JSON.parse(e.postData.contents);
  const deviceId = data.deviceId;
  const id = data.id;

  if (!deviceId || !id) return outputJSON({ error: "Missing deviceId or id" });

  const sheet = ss.getSheetByName(deviceId);
  if (!sheet) return outputJSON({ error: "Sheet not found" });

  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0].toString() === id.toString()) {
      // ✅ Map Angular field names to sheet columns (convert strings to numbers)
      sheet.getRange(i + 1, 2, 1, headers.length - 1).setValues([[
        data.farmerName || "",
        data.contactNumber || "",
        data.date || "",
        parseFloat(data.landInAcres) || 0,
        parseFloat(data.ratePerAcre) || 0,
        parseFloat(data.totalPayment) || 0,
        parseFloat(data.paidOnSight) || 0,
        data.fullPaymentDate || ""
      ]]);
      return outputJSON({ success: true });
    }
  }

  return outputJSON({ error: "ID not found" });
}
