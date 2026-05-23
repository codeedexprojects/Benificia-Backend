/*
  Warnings:

  - You are about to drop the `investment_schemes` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "investment_schemes" DROP CONSTRAINT "investment_schemes_added_by_admin_fkey";

-- AlterTable
ALTER TABLE "enquiries" ALTER COLUMN "id" DROP DEFAULT;

-- DropTable
DROP TABLE "investment_schemes";
