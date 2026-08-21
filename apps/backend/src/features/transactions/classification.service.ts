import { db } from '../../database/client.js';
import { userCategoryMappings } from '../../database/schema/user_category_mappings.js';
import { and, eq } from 'drizzle-orm';
import fuzzysort from 'fuzzysort';

export interface ClassificationResult {
  category: string;
  categorySource: 'user' | 'rule' | 'fuzzy' | 'unknown';
  categoryConfidence: number; // 0 - 100
}

// A maintainable global dictionary of aliases to top-level categories
export const GLOBAL_CATEGORY_RULES: Record<string, string[]> = {
  'Food': [
    'shawarma', 'shawaya', 'alfaham', 'thandoori', 'biryani', 'pizza', 'burger', 'cake', 'restaurant', 'food', 'meal', 'lunch', 'dinner', 'breakfast', 'coffee', 'tea'
  ],
  'Transport and Vehicle': [
    'train', 'train ticket', 'bus', 'bus ticket', 'taxi', 'uber', 'auto', 'metro', 'flight', 'airplane',
    'car', 'bike', 'motorcycle', 'honda', 'vehicle', 'vehicle maintenance', 'car maintenance', 'bike maintenance', 'car repair', 'bike repair', 'fuel', 'petrol', 'diesel'
  ],
  'Household': [
    'bulb', 'light bulb', 'house maintenance', 'maintenance', 'furniture', 'appliance', 'groceries', 'rent'
  ],
  'Shopping and Lifestyle': [
    'shoe', 'shirt', 'pant', 'clothes', 'shopping', 'amazon', 'flipkart', 'myntra', 'lifestyle'
  ],
  'Bills and Utilities': [
    'electricity', 'water', 'internet', 'wifi', 'recharge', 'mobile bill'
  ],
  'Health': [
    'hospital', 'doctor', 'medicine', 'pharmacy', 'clinic'
  ],
  'Entertainment': [
    'movie', 'cinema', 'netflix', 'spotify', 'games'
  ],
  'Travel': [
    'hotel', 'resort', 'vacation', 'trip'
  ],
  'Education': [
    'school', 'college', 'course', 'udemy', 'books', 'tuition'
  ],
  'Finance': [
    'emi', 'loan', 'tax', 'insurance', 'investment'
  ],
  'Others': [
    'others', 'miscellaneous', 'misc', 'other'
  ]
};

export class TransactionClassifier {
  
  private static normalize(text: string): string {
    return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  static async classify(description: string, userId: string): Promise<ClassificationResult> {
    const normalizedDescription = this.normalize(description);
    if (!normalizedDescription) {
      return { category: 'Uncategorized', categorySource: 'unknown', categoryConfidence: 0 };
    }

    // 1. Check user-specific mappings (Exact Match)
    const userMapping = await db.select().from(userCategoryMappings).where(
      and(
        eq(userCategoryMappings.userId, userId),
        eq(userCategoryMappings.normalizedTerm, normalizedDescription)
      )
    ).limit(1);

    if (userMapping && userMapping.length > 0) {
      if (userMapping[0].ignored) {
        return {
          category: 'Uncategorized',
          categorySource: 'user',
          categoryConfidence: 100
        };
      }
      return {
        category: userMapping[0].category,
        categorySource: 'user',
        categoryConfidence: 100
      };
    }

    // 2. Global Rules - Exact Match First
    for (const [category, aliases] of Object.entries(GLOBAL_CATEGORY_RULES)) {
      for (const alias of aliases) {
        if (normalizedDescription === alias) {
          return { category, categorySource: 'rule', categoryConfidence: 100 };
        }
      }
    }

    // 3. Global Rules - Token/Phrase Match
    let bestTokenMatch: ClassificationResult | null = null;
    for (const [category, aliases] of Object.entries(GLOBAL_CATEGORY_RULES)) {
      for (const alias of aliases) {
        const regex = new RegExp(`\\b${alias}\\b`, 'i');
        if (regex.test(normalizedDescription)) {
          const confidence = Math.min(90, Math.floor((alias.length / normalizedDescription.length) * 100) + 40);
          if (!bestTokenMatch || confidence > bestTokenMatch.categoryConfidence) {
             bestTokenMatch = { category, categorySource: 'rule', categoryConfidence: confidence };
          }
        }
      }
    }
    if (bestTokenMatch) return bestTokenMatch;

    // 4. Fuzzy Matching (Restricted to prevent false positives like 'gas' -> 'games')
    if (normalizedDescription.length > 3) {
      const targets: { category: string; alias: string }[] = [];
      for (const [category, aliases] of Object.entries(GLOBAL_CATEGORY_RULES)) {
        for (const alias of aliases) {
           // Only fuzzy match if length difference is small (e.g. max 2 chars)
           if (Math.abs(alias.length - normalizedDescription.length) <= 2) {
             targets.push({ category, alias });
           }
        }
      }

      const results = fuzzysort.go(normalizedDescription, targets, { key: 'alias', threshold: -10000 });
      if (results && results.length > 0) {
        const bestMatch = results[0];
        const bestScore = Math.max(0, 100 + bestMatch.score);
        
        if (bestScore >= 85) {
          let secondBestScore = 0;
          for (let i = 1; i < results.length; i++) {
            if (results[i].obj.category !== bestMatch.obj.category) {
              secondBestScore = Math.max(0, 100 + results[i].score);
              break;
            }
          }
          
          const margin = bestScore - secondBestScore;
          let isConfident = false;
          
          if (bestScore >= 95) isConfident = true;
          else if (bestScore >= 90 && margin >= 5) isConfident = true;
          else if (bestScore >= 85 && margin >= 10) isConfident = true;
          
          if (isConfident) {
            return {
              category: bestMatch.obj.category,
              categorySource: 'fuzzy',
              categoryConfidence: Math.floor(bestScore)
            };
          }
        }
      }
    }

    // 5. Fallback
    return {
      category: 'Uncategorized',
      categorySource: 'unknown',
      categoryConfidence: 0
    };
  }
}
