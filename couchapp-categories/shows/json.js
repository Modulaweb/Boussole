function(doc, req) {  
  return {
    body: JSON.stringify(doc.categories),
    headers: {
      "Content-Type" : "application/json"
    }
  };
}
