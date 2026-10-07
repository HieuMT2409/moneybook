import { ConflictException, Injectable } from '@nestjs/common';
import { CategoryType } from '@prisma/client';
import { requireCategory } from '../../common/ownership';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, type?: CategoryType) {
    return this.prisma.category.findMany({
      where: { userId, ...(type ? { type } : {}) },
      orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  create(userId: string, dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: { userId, ...dto, name: dto.name.trim() } });
  }

  async update(userId: string, id: string, dto: UpdateCategoryDto) {
    await requireCategory(this.prisma, userId, id);
    return this.prisma.category.update({
      where: { id, userId },
      data: { ...dto, ...(dto.name ? { name: dto.name.trim() } : {}) },
    });
  }

  async remove(userId: string, id: string): Promise<{ deleted: true }> {
    await requireCategory(this.prisma, userId, id);
    const [transactions, recurring] = await Promise.all([
      this.prisma.transaction.count({ where: { categoryId: id, userId } }),
      this.prisma.recurringTransaction.count({ where: { categoryId: id, userId } }),
    ]);
    if (transactions + recurring > 0) {
      throw new ConflictException('Category is used by transactions or recurring rules and cannot be deleted');
    }
    await this.prisma.category.delete({ where: { id, userId } }); // budgets cascade
    return { deleted: true };
  }
}
