import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoryType, Prisma } from '@prisma/client';

/**
 * Data-isolation helpers. A record that belongs to someone else is reported as "not found"
 * (404, not 403) so the API never confirms that another user's id exists.
 */
export async function requireAccount(
  db: Prisma.TransactionClient,
  userId: string,
  id: string,
  options: { mustBeActive?: boolean } = {},
) {
  const account = await db.account.findFirst({ where: { id, userId } });
  if (!account) throw new NotFoundException('Account not found');
  if (options.mustBeActive && !account.isActive) {
    throw new BadRequestException(`Account "${account.name}" is disabled`);
  }
  return account;
}

export async function requireCategory(
  db: Prisma.TransactionClient,
  userId: string,
  id: string,
  expectedType?: CategoryType,
) {
  const category = await db.category.findFirst({ where: { id, userId } });
  if (!category) throw new NotFoundException('Category not found');
  if (expectedType && category.type !== expectedType) {
    throw new BadRequestException(`Category "${category.name}" is not an ${expectedType} category`);
  }
  return category;
}
