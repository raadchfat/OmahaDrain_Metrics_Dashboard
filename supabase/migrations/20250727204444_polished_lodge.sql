/*
  # Standardize Date Formats Across All Tables

  1. New Functions
    - `standardize_date_format()` - Converts various date formats to YYYY-MM-DD
    - Trigger functions for each table to auto-convert dates on insert/update

  2. Database Triggers
    - Auto-convert date formats when data is inserted or updated
    - Handles multiple date formats (MM/DD/YYYY, MM-DD-YYYY, YYYY-MM-DD, etc.)
    - Preserves NULL values and handles invalid dates gracefully

  3. Tables Updated
    - SoldLineitems: Invoice Date
    - Opportunities: Date
    - Jobs_revenue: Completed (if it contains dates)
    - Reviews: Review Date
    - memberships: Sold_On and sold_on_clean
*/

-- Create a function to standardize date formats
CREATE OR REPLACE FUNCTION standardize_date_format(input_date text)
RETURNS date
LANGUAGE plpgsql
AS $$
DECLARE
    result_date date;
    clean_input text;
BEGIN
    -- Return NULL if input is NULL or empty
    IF input_date IS NULL OR trim(input_date) = '' THEN
        RETURN NULL;
    END IF;
    
    -- Clean the input (remove extra spaces, handle common variations)
    clean_input := trim(input_date);
    
    -- Try different date formats
    BEGIN
        -- Try YYYY-MM-DD format first (ISO standard)
        IF clean_input ~ '^\d{4}-\d{1,2}-\d{1,2}$' THEN
            result_date := clean_input::date;
            RETURN result_date;
        END IF;
        
        -- Try MM/DD/YYYY format
        IF clean_input ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
            result_date := clean_input::date;
            RETURN result_date;
        END IF;
        
        -- Try MM-DD-YYYY format
        IF clean_input ~ '^\d{1,2}-\d{1,2}-\d{4}$' THEN
            -- Convert MM-DD-YYYY to MM/DD/YYYY for PostgreSQL parsing
            clean_input := replace(clean_input, '-', '/');
            result_date := clean_input::date;
            RETURN result_date;
        END IF;
        
        -- Try MM/DD/YY format (assume 20XX for 00-30, 19XX for 31-99)
        IF clean_input ~ '^\d{1,2}/\d{1,2}/\d{2}$' THEN
            DECLARE
                parts text[];
                year_part int;
                full_year int;
            BEGIN
                parts := string_to_array(clean_input, '/');
                year_part := parts[3]::int;
                
                IF year_part <= 30 THEN
                    full_year := 2000 + year_part;
                ELSE
                    full_year := 1900 + year_part;
                END IF;
                
                result_date := (parts[1] || '/' || parts[2] || '/' || full_year)::date;
                RETURN result_date;
            END;
        END IF;
        
        -- Try direct conversion as fallback
        result_date := clean_input::date;
        RETURN result_date;
        
    EXCEPTION WHEN OTHERS THEN
        -- If all parsing fails, return NULL and log the issue
        RAISE WARNING 'Could not parse date: %', input_date;
        RETURN NULL;
    END;
END;
$$;

-- Trigger function for SoldLineitems table
CREATE OR REPLACE FUNCTION standardize_soldlineitems_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Standardize Invoice Date
    IF NEW."Invoice Date" IS NOT NULL THEN
        NEW."Invoice Date" := standardize_date_format(NEW."Invoice Date"::text);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger function for Opportunities table
CREATE OR REPLACE FUNCTION standardize_opportunities_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Standardize Date column
    IF NEW."Date" IS NOT NULL THEN
        NEW."Date" := standardize_date_format(NEW."Date"::text);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger function for Jobs_revenue table
CREATE OR REPLACE FUNCTION standardize_jobs_revenue_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Standardize Completed column if it contains date data
    IF NEW."Completed" IS NOT NULL AND NEW."Completed" ~ '^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$' THEN
        -- Only convert if it looks like a date
        DECLARE
            converted_date date;
        BEGIN
            converted_date := standardize_date_format(NEW."Completed");
            IF converted_date IS NOT NULL THEN
                NEW."Completed" := converted_date::text;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Keep original value if conversion fails
            NULL;
        END;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger function for Reviews table
CREATE OR REPLACE FUNCTION standardize_reviews_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Standardize Review Date
    IF NEW."Review Date" IS NOT NULL THEN
        NEW."Review Date" := standardize_date_format(NEW."Review Date"::text);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Trigger function for memberships table
CREATE OR REPLACE FUNCTION standardize_memberships_dates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Standardize Sold_On
    IF NEW."Sold_On" IS NOT NULL THEN
        DECLARE
            converted_date date;
        BEGIN
            converted_date := standardize_date_format(NEW."Sold_On");
            IF converted_date IS NOT NULL THEN
                NEW."Sold_On" := converted_date::text;
                -- Also update the clean date column
                NEW.sold_on_clean := converted_date;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Keep original value if conversion fails
            NULL;
        END;
    END IF;
    
    -- Ensure sold_on_clean is always updated when Sold_On changes
    IF NEW."Sold_On" IS NOT NULL AND NEW.sold_on_clean IS NULL THEN
        NEW.sold_on_clean := standardize_date_format(NEW."Sold_On");
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers for each table
DROP TRIGGER IF EXISTS trg_standardize_soldlineitems_dates ON "SoldLineitems";
CREATE TRIGGER trg_standardize_soldlineitems_dates
    BEFORE INSERT OR UPDATE ON "SoldLineitems"
    FOR EACH ROW
    EXECUTE FUNCTION standardize_soldlineitems_dates();

DROP TRIGGER IF EXISTS trg_standardize_opportunities_dates ON "Opportunities";
CREATE TRIGGER trg_standardize_opportunities_dates
    BEFORE INSERT OR UPDATE ON "Opportunities"
    FOR EACH ROW
    EXECUTE FUNCTION standardize_opportunities_dates();

DROP TRIGGER IF EXISTS trg_standardize_jobs_revenue_dates ON "Jobs_revenue";
CREATE TRIGGER trg_standardize_jobs_revenue_dates
    BEFORE INSERT OR UPDATE ON "Jobs_revenue"
    FOR EACH ROW
    EXECUTE FUNCTION standardize_jobs_revenue_dates();

DROP TRIGGER IF EXISTS trg_standardize_reviews_dates ON "Reviews";
CREATE TRIGGER trg_standardize_reviews_dates
    BEFORE INSERT OR UPDATE ON "Reviews"
    FOR EACH ROW
    EXECUTE FUNCTION standardize_reviews_dates();

DROP TRIGGER IF EXISTS trg_standardize_memberships_dates ON "memberships";
CREATE TRIGGER trg_standardize_memberships_dates
    BEFORE INSERT OR UPDATE ON "memberships"
    FOR EACH ROW
    EXECUTE FUNCTION standardize_memberships_dates();

-- Update existing data to standardized format (optional - run manually if needed)
-- Uncomment these if you want to convert existing data:

/*
-- Update SoldLineitems existing data
UPDATE "SoldLineitems" 
SET "Invoice Date" = standardize_date_format("Invoice Date"::text)
WHERE "Invoice Date" IS NOT NULL;

-- Update Opportunities existing data
UPDATE "Opportunities" 
SET "Date" = standardize_date_format("Date"::text)
WHERE "Date" IS NOT NULL;

-- Update Reviews existing data
UPDATE "Reviews" 
SET "Review Date" = standardize_date_format("Review Date"::text)
WHERE "Review Date" IS NOT NULL;

-- Update memberships existing data
UPDATE "memberships" 
SET "Sold_On" = standardize_date_format("Sold_On")::text,
    sold_on_clean = standardize_date_format("Sold_On")
WHERE "Sold_On" IS NOT NULL;
*/