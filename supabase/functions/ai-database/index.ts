import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompt for the AI - Full Backend Engineer Mode
const SYSTEM_PROMPT = `أنت مهندس Backend محترف ومتخصص في قواعد بيانات PostgreSQL و Supabase.

لديك صلاحيات كاملة على قاعدة البيانات:
- تنفيذ أي استعلام SQL (SELECT, INSERT, UPDATE, DELETE)
- إنشاء جداول جديدة (CREATE TABLE)
- تعديل هيكل الجداول (ALTER TABLE)
- حذف الجداول (DROP TABLE)
- إنشاء الفهارس (CREATE INDEX)
- إنشاء الـ Views
- إنشاء الـ Functions
- إنشاء الـ Triggers
- إدارة الـ RLS Policies
- أي عملية SQL أخرى

الأدوات المتاحة لك:

1. list_tables - عرض جميع الجداول في قاعدة البيانات
2. describe_table - عرض هيكل جدول معين (الأعمدة والأنواع)
3. execute_sql - تنفيذ أي استعلام SQL مباشرة (لديك صلاحيات كاملة)

قواعد مهمة:
- استخدم execute_sql لأي عملية SQL تريدها
- عند إنشاء جداول جديدة، تأكد من إضافة RLS policies إذا لزم الأمر
- اشرح للمستخدم ما ستفعله قبل تنفيذه
- أعطِ ملخصاً واضحاً لنتائج العمليات
- كن حذراً مع عمليات الحذف واطلب تأكيداً إذا كانت خطيرة
- استخدم اللغة العربية في الردود

أنت قادر على:
- إنشاء تطبيقات كاملة من الصفر
- تصميم قواعد بيانات معقدة
- تحسين الأداء
- إصلاح المشاكل
- تنفيذ أي طلب يتعلق بقاعدة البيانات`;

// Available tools for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "list_tables",
      description: "عرض جميع الجداول المتاحة في قاعدة البيانات مع معلومات عنها",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "describe_table",
      description: "عرض هيكل جدول معين - الأعمدة وأنواعها والقيود",
      parameters: {
        type: "object",
        properties: {
          table_name: {
            type: "string",
            description: "اسم الجدول المراد وصفه",
          },
        },
        required: ["table_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_sql",
      description: "تنفيذ أي استعلام SQL مباشرة - يشمل SELECT, INSERT, UPDATE, DELETE, CREATE TABLE, ALTER TABLE, DROP TABLE, CREATE INDEX, وأي عملية SQL أخرى",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "استعلام SQL المراد تنفيذه",
          },
          description: {
            type: "string",
            description: "وصف قصير لما يفعله هذا الاستعلام",
          },
        },
        required: ["sql"],
      },
    },
  },
];

// Execute tool calls against user's Supabase
async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string> {
  const userSupabase = createClient(supabaseUrl, supabaseKey);

  try {
    switch (toolName) {
      case "list_tables": {
        console.log("Listing tables using OpenAPI schema...");
        
        // Use OpenAPI endpoint to get available tables
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });
        
        if (response.ok) {
          const openApiSpec = await response.json();
          const paths = openApiSpec.paths || {};
          const tables: string[] = [];
          
          for (const path of Object.keys(paths)) {
            // Extract table names from paths like "/table_name"
            if (path.startsWith('/') && !path.includes('{')) {
              const tableName = path.slice(1);
              if (tableName && tableName !== 'rpc') {
                tables.push(tableName);
              }
            }
          }
          
          if (tables.length > 0) {
            return JSON.stringify({
              success: true,
              tables: tables,
              count: tables.length,
              message: `تم العثور على ${tables.length} جدول`
            });
          }
        }
        
        // Fallback: Try to check for common table patterns
        console.log("OpenAPI failed, trying common tables check...");
        
        const commonTables = ['users', 'profiles', 'posts', 'comments', 'products', 'orders', 'categories'];
        const existingTables: string[] = [];
        
        for (const table of commonTables) {
          const { error } = await userSupabase.from(table).select('*').limit(0);
          if (!error) {
            existingTables.push(table);
          }
        }
        
        if (existingTables.length > 0) {
          return JSON.stringify({
            success: true,
            tables: existingTables,
            note: "هذه الجداول التي تم اكتشافها. قد توجد جداول أخرى."
          });
        }
        
        return JSON.stringify({
          success: false,
          message: "لم يتم العثور على جداول في قاعدة البيانات. قد تكون فارغة أو الصلاحيات محدودة.",
          hint: "يمكنك إنشاء جدول جديد باستخدام execute_sql"
        });
      }

      case "describe_table": {
        const tableName = args.table_name as string;
        
        // Get column information
        const { data: columns, error } = await userSupabase
          .from(tableName)
          .select("*")
          .limit(0);
        
        if (error) {
          // Try to get structure via SQL
          const structureQuery = `
            SELECT 
              column_name,
              data_type,
              is_nullable,
              column_default,
              character_maximum_length
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = '${tableName}'
            ORDER BY ordinal_position
          `;
          
          return JSON.stringify({
            error: error.message,
            hint: `جرب execute_sql مع الاستعلام: ${structureQuery}`,
          });
        }
        
        // Get one sample row to understand structure
        const { data: sample } = await userSupabase
          .from(tableName)
          .select("*")
          .limit(1);
        
        return JSON.stringify({
          table_name: tableName,
          sample_row: sample?.[0] || null,
          message: sample ? "تم جلب عينة من البيانات" : "الجدول فارغ",
        });
      }

      case "execute_sql": {
        const sql = args.sql as string;
        const description = args.description as string || "تنفيذ استعلام SQL";
        
        console.log(`Executing SQL: ${sql}`);
        console.log(`Description: ${description}`);
        
        // Use the REST API to execute SQL via rpc
        // First, try to use the rpc endpoint
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({ query: sql }),
        });
        
        if (response.ok) {
          const result = await response.json();
          return JSON.stringify({
            success: true,
            description,
            result,
          });
        }
        
        // If exec_sql doesn't exist, try query directly via PostgREST for simple queries
        const sqlLower = sql.toLowerCase().trim();
        
        // Handle SELECT queries
        if (sqlLower.startsWith("select")) {
          // Parse simple SELECT queries
          const fromMatch = sql.match(/from\s+["']?(\w+)["']?/i);
          if (fromMatch) {
            const tableName = fromMatch[1];
            const { data, error } = await userSupabase
              .from(tableName)
              .select("*")
              .limit(100);
            
            if (error) {
              return JSON.stringify({
                success: false,
                error: error.message,
                hint: "تأكد من وجود الجدول وصلاحيات الوصول",
              });
            }
            
            return JSON.stringify({
              success: true,
              description,
              data,
              count: data?.length || 0,
            });
          }
        }
        
        // Handle INSERT queries
        if (sqlLower.startsWith("insert")) {
          const tableMatch = sql.match(/insert\s+into\s+["']?(\w+)["']?/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            
            // Parse values - simplified parsing
            const valuesMatch = sql.match(/values\s*\(([^)]+)\)/i);
            const columnsMatch = sql.match(/\(([^)]+)\)\s*values/i);
            
            if (valuesMatch && columnsMatch) {
              const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/["']/g, ''));
              const values = valuesMatch[1].split(',').map(v => {
                const trimmed = v.trim();
                if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
                  return trimmed.slice(1, -1);
                }
                if (trimmed === 'true') return true;
                if (trimmed === 'false') return false;
                if (trimmed === 'null') return null;
                if (!isNaN(Number(trimmed))) return Number(trimmed);
                return trimmed;
              });
              
              const insertData: Record<string, unknown> = {};
              columns.forEach((col, idx) => {
                insertData[col] = values[idx];
              });
              
              const { data, error } = await userSupabase
                .from(tableName)
                .insert(insertData)
                .select();
              
              if (error) {
                return JSON.stringify({
                  success: false,
                  error: error.message,
                });
              }
              
              return JSON.stringify({
                success: true,
                description,
                inserted: data,
              });
            }
          }
        }
        
        // Handle UPDATE queries
        if (sqlLower.startsWith("update")) {
          const tableMatch = sql.match(/update\s+["']?(\w+)["']?/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            
            // This is a simplified approach - for complex updates, we need the exec_sql function
            return JSON.stringify({
              success: false,
              error: "للتعديلات المعقدة، تحتاج لإنشاء دالة exec_sql في قاعدة البيانات",
              suggestion: `يمكنني مساعدتك في إنشاء هذه الدالة. هل تريد ذلك؟`,
              manual_sql: sql,
            });
          }
        }
        
        // Handle DELETE queries
        if (sqlLower.startsWith("delete")) {
          const tableMatch = sql.match(/delete\s+from\s+["']?(\w+)["']?/i);
          const whereMatch = sql.match(/where\s+(\w+)\s*=\s*['"]?([^'";\s]+)['"]?/i);
          
          if (tableMatch && whereMatch) {
            const tableName = tableMatch[1];
            const column = whereMatch[1];
            const value = whereMatch[2];
            
            const { data, error } = await userSupabase
              .from(tableName)
              .delete()
              .eq(column, value)
              .select();
            
            if (error) {
              return JSON.stringify({
                success: false,
                error: error.message,
              });
            }
            
            return JSON.stringify({
              success: true,
              description,
              deleted: data,
              count: data?.length || 0,
            });
          }
        }
        
        // For DDL operations (CREATE, ALTER, DROP), we need the exec_sql function
        if (sqlLower.startsWith("create") || sqlLower.startsWith("alter") || sqlLower.startsWith("drop")) {
          return JSON.stringify({
            success: false,
            requires_setup: true,
            message: "لتنفيذ عمليات DDL (إنشاء/تعديل/حذف الجداول)، تحتاج لإنشاء دالة exec_sql في قاعدة البيانات.",
            setup_sql: `
-- قم بتنفيذ هذا الكود في SQL Editor في Supabase Dashboard:
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE query;
  RETURN json_build_object('success', true, 'message', 'تم تنفيذ الاستعلام بنجاح');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- منح الصلاحيات
GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
            `,
            requested_sql: sql,
          });
        }
        
        return JSON.stringify({
          success: false,
          error: "لم أتمكن من تحليل الاستعلام",
          sql,
        });
      }

      default:
        return JSON.stringify({ error: `أداة غير معروفة: ${toolName}` });
    }
  } catch (error: any) {
    console.error(`Tool execution error (${toolName}):`, error);
    return JSON.stringify({
      error: error.message,
      tool: toolName,
      args,
    });
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory, supabaseUrl, supabaseKey } = await req.json();

    // Validate user's Supabase credentials
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          error: "missing_credentials",
          response: "يرجى توفير رابط Supabase و API Key",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate URL format
    if (!supabaseUrl.includes("supabase.co") && !supabaseUrl.includes("supabase.in")) {
      return new Response(
        JSON.stringify({
          error: "invalid_url",
          response: "رابط Supabase غير صحيح. يجب أن يكون بالشكل: https://xxxxx.supabase.co",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test connection
    try {
      const testClient = createClient(supabaseUrl, supabaseKey);
      // Simple health check
      await testClient.from('_test_connection_').select('*').limit(1).maybeSingle();
    } catch (connError: any) {
      if (connError.message?.includes("Invalid API key")) {
        return new Response(
          JSON.stringify({
            error: "invalid_key",
            response: "مفتاح API غير صحيح. تأكد من استخدام anon key أو service_role key",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Other errors might be okay (table doesn't exist, etc.)
    }

    // Prepare messages for OpenAI
    const allMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      ...messages,
    ];

    console.log("Calling Lovable AI Gateway...");

    // Call Lovable AI Gateway with correct URL
    let response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: allMessages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;

    // Handle tool calls in a loop
    let iterations = 0;
    const maxIterations = 10;

    while (assistantMessage.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`Tool call iteration ${iterations}`);

      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

        console.log(`Executing tool: ${toolName}`, toolArgs);

        const result = await executeToolCall(toolName, toolArgs, supabaseUrl, supabaseKey);

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // Continue conversation with tool results
      allMessages.push(assistantMessage);
      allMessages.push(...toolResults);

      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: allMessages,
          tools,
          tool_choice: "auto",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI Gateway error in loop:", errorText);
        throw new Error(`AI Gateway error: ${response.status}`);
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
    }

    const finalResponse = assistantMessage.content || "تم تنفيذ العملية بنجاح.";

    return new Response(
      JSON.stringify({ response: finalResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in ai-database function:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        response: `حدث خطأ: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
