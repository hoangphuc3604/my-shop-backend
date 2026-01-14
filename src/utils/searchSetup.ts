import { AppDataSource } from '../config/database'
import { logger } from '../config/logger'

export async function configureSearchEngine() {
  const queryRunner = AppDataSource.createQueryRunner()
  await queryRunner.connect()

  try {
    logger.info('Configuring search engine...')

    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm')

    await queryRunner.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS document_with_weights tsvector
    `)

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION products_tsvector_trigger() RETURNS trigger AS $$
      BEGIN
        new.document_with_weights :=
          setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(new.sku, '')), 'B') ||
          setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
        RETURN new;
      END
      $$ LANGUAGE plpgsql
    `)

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS tsvectorupdate ON products
    `)
    await queryRunner.query(`
      CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
      ON products FOR EACH ROW EXECUTE PROCEDURE products_tsvector_trigger()
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS products_search_idx ON products USING GIN (document_with_weights)
    `)
    await queryRunner.query(`
      DROP INDEX IF EXISTS products_name_trgm_idx
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS products_name_trgm_idx ON products USING GIN (lower(name) gin_trgm_ops)
    `)

    await queryRunner.query(`
      UPDATE products SET document_with_weights =  
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(sku, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C')
      WHERE document_with_weights IS NULL
    `)

    logger.info('Search engine configured successfully')
  } catch (error) {
    logger.error('Error configuring search engine:', error)
    throw error
  } finally {
    await queryRunner.release()
  }
}
