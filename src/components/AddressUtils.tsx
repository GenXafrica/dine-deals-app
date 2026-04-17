// Utility function to shorten address by removing business name, province, postal code, and country
export const shortenAddress = (address: string): string => {
  if (!address) return '';
  
  // Split address by commas
  const parts = address.split(',').map(part => part.trim());
  
  // If only one part, return as is (likely just street number and name)
  if (parts.length <= 1) return address;
  
  // Remove last parts that typically contain province, postal code, country
  // Keep first 1-2 parts (street number, street name, possibly unit/suite)
  const streetParts = parts.slice(0, Math.min(2, parts.length));
  
  // Filter out parts that look like business names (contain common business words)
  const businessWords = ['restaurant', 'cafe', 'pizza', 'grill', 'bar', 'pub', 'diner', 'bistro', 'kitchen', 'house', 'shop', 'store', 'market', 'bakery', 'food', 'eat', 'dining'];
  
  const filteredParts = streetParts.filter(part => {
    const lowerPart = part.toLowerCase();
    return !businessWords.some(word => lowerPart.includes(word));
  });
  
  // If we filtered out everything, use first part
  const finalParts = filteredParts.length > 0 ? filteredParts : [streetParts[0]];
  
  return finalParts.join(', ');
};