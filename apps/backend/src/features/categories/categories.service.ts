import { eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { db } from '../../database/client.js';
import { userCategories } from '../../database/schema/user_categories.js';
import { AppError } from '../../common/errors/index.js';

export const categoriesService = {
  async getCustomCategories(userId: string) {
    const categories = await db
      .select()
      .from(userCategories)
      .where(eq(userCategories.userId, userId));
    return categories;
  },

  async createCustomCategory(userId: string, name: string) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new AppError('Category name cannot be empty', 400, 'INVALID_CATEGORY_NAME');
    }
    if (trimmedName.length > 50) {
      throw new AppError('Category name is too long', 400, 'INVALID_CATEGORY_NAME');
    }

    const normalizedName = trimmedName.toLowerCase();

    // Check for duplicates
    const existing = await db
      .select()
      .from(userCategories)
      .where(eq(userCategories.userId, userId))
      .then((rows) => rows.find((r) => r.normalizedName === normalizedName));

    if (existing) {
      throw new AppError('Category already exists', 409, 'CATEGORY_ALREADY_EXISTS');
    }

    const [newCategory] = await db
      .insert(userCategories)
      .values({
        id: ulid(),
        userId,
        name: trimmedName,
        normalizedName,
      })
      .returning();

    return newCategory;
  }
};
