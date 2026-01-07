import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// System prompt - مهندس Backend محترف بلهجة بشرية
const SYSTEM_PROMPT = `انت مهندس Backend خبير ومحترف، متخصص في PostgreSQL و Supabase.

## شخصيتك:
- بتتكلم بلهجة طبيعية وبشرية، مش روبوت
- ودود ومتعاون، بتشرح الحاجات بطريقة سهلة
- لو حد سألك سؤال بسيط، ترد عليه بشكل مختصر ولطيف
- لو الموضوع تقني، بتشرحه خطوة خطوة
- بتستخدم إيموجي أحياناً عشان الكلام يبقى حيوي 😊
- لو غلطت أو مش فاهم حاجة، بتعترف وتسأل

## صلاحياتك (لديك أكسس كامل! 🔓):
✅ SELECT - قراءة وعرض البيانات
✅ INSERT - إضافة بيانات جديدة  
✅ UPDATE - تعديل البيانات الموجودة
✅ DELETE - حذف البيانات
✅ CREATE TABLE - إنشاء جداول جديدة
✅ ALTER TABLE - تعديل هيكل الجداول
✅ DROP TABLE - حذف جداول (بحذر!)
✅ CREATE INDEX - إنشاء فهارس
✅ CREATE VIEW - إنشاء Views
✅ CREATE FUNCTION - إنشاء Functions
✅ CREATE TRIGGER - إنشاء Triggers
✅ RLS Policies - إدارة سياسات الأمان
✅ أي SQL تاني! - لديك صلاحيات كاملة

## الأدوات المتاحة:

1. **list_tables** - عرض كل الجداول الموجودة
2. **describe_table** - وصف جدول معين (الأعمدة والأنواع)
3. **execute_sql** - تنفيذ أي كود SQL (ده السلاح الأقوى عندك! 💪)
4. **select_data** - جلب بيانات من جدول معين
5. **insert_data** - إضافة صف جديد لجدول
6. **update_data** - تعديل بيانات موجودة
7. **delete_data** - حذف بيانات

## طريقة الشغل:

🔹 لما حد يطلب منك حاجة، افهم الطلب الأول
🔹 قوله إيه اللي هتعمله قبل ما تنفذ
🔹 نفذ العملية واشرحله النتيجة
🔹 لو العملية خطيرة (زي DELETE أو DROP)، اتأكد منه الأول
🔹 لو حصل error، اشرحله المشكلة وحاول تحلها

## أمثلة على اللهجة:

❌ "تم تنفيذ الاستعلام بنجاح"
✅ "تمام! خلصت العملية بنجاح 👍"

❌ "يرجى تحديد اسم الجدول"
✅ "محتاج منك اسم الجدول عشان أقدر أساعدك"

❌ "حدث خطأ أثناء التنفيذ"
✅ "أوبس! في مشكلة حصلت 😅 خليني أشرحلك..."

## تحذيرات مهمة:
⚠️ قبل أي DELETE أو DROP، اسأل المستخدم "متأكد؟"
⚠️ لو هتعمل تغيير كبير، اشرح الـ impact الأول
⚠️ دايماً اعمل SELECT الأول عشان تتأكد من البيانات

انت جاهز تساعد في أي حاجة متعلقة بقاعدة البيانات! 🚀`;

// Available tools for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "list_tables",
      description: "عرض كل الجداول الموجودة في قاعدة البيانات",
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
      description: "عرض تفاصيل جدول معين - الأعمدة وأنواعها",
      parameters: {
        type: "object",
        properties: {
          table_name: {
            type: "string",
            description: "اسم الجدول",
          },
        },
        required: ["table_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "select_data",
      description: "جلب بيانات من جدول معين مع إمكانية الفلترة",
      parameters: {
        type: "object",
        properties: {
          table_name: {
            type: "string",
            description: "اسم الجدول",
          },
          columns: {
            type: "string",
            description: "الأعمدة المطلوبة (اختياري، افتراضياً كل الأعمدة)",
          },
          filter_column: {
            type: "string",
            description: "العمود للفلترة (اختياري)",
          },
          filter_value: {
            type: "string",
            description: "القيمة للفلترة (اختياري)",
          },
          limit: {
            type: "number",
            description: "عدد الصفوف (افتراضياً 50)",
          },
        },
        required: ["table_name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "insert_data",
      description: "إضافة صف جديد لجدول",
      parameters: {
        type: "object",
        properties: {
          table_name: {
            type: "string",
            description: "اسم الجدول",
          },
          data: {
            type: "object",
            description: "البيانات المراد إضافتها ككائن JSON",
          },
        },
        required: ["table_name", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_data",
      description: "تعديل بيانات موجودة في جدول",
      parameters: {
        type: "object",
        properties: {
          table_name: {
            type: "string",
            description: "اسم الجدول",
          },
          filter_column: {
            type: "string",
            description: "العمود للتحديد (مثل id)",
          },
          filter_value: {
            type: "string",
            description: "قيمة التحديد",
          },
          data: {
            type: "object",
            description: "البيانات الجديدة",
          },
        },
        required: ["table_name", "filter_column", "filter_value", "data"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_data",
      description: "حذف صفوف من جدول",
      parameters: {
        type: "object",
        properties: {
          table_name: {
            type: "string",
            description: "اسم الجدول",
          },
          filter_column: {
            type: "string",
            description: "العمود للتحديد",
          },
          filter_value: {
            type: "string",
            description: "قيمة التحديد",
          },
        },
        required: ["table_name", "filter_column", "filter_value"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "execute_sql",
      description: "تنفيذ أي كود SQL مباشرة - للعمليات المتقدمة مثل CREATE TABLE, ALTER, DROP, أو استعلامات معقدة",
      parameters: {
        type: "object",
        properties: {
          sql: {
            type: "string",
            description: "كود SQL المراد تنفيذه",
          },
          description: {
            type: "string",
            description: "وصف قصير للعملية",
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
        console.log("📋 جاري عرض الجداول...");
        
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
            });
          }
        }
        
        return JSON.stringify({
          success: true,
          tables: [],
          message: "قاعدة البيانات فاضية، مفيش جداول لسه"
        });
      }

      case "describe_table": {
        const tableName = args.table_name as string;
        console.log(`📊 جاري وصف الجدول: ${tableName}`);
        
        // Get sample data to understand structure
        const { data: sample, error } = await userSupabase
          .from(tableName)
          .select("*")
          .limit(5);
        
        if (error) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
        
        // Analyze columns from sample
        const columns: Record<string, string> = {};
        if (sample && sample.length > 0) {
          for (const [key, value] of Object.entries(sample[0])) {
            columns[key] = typeof value;
          }
        }
        
        return JSON.stringify({
          success: true,
          table_name: tableName,
          columns,
          sample_data: sample,
          row_count: sample?.length || 0,
        });
      }

      case "select_data": {
        const tableName = args.table_name as string;
        const columns = (args.columns as string) || "*";
        const filterColumn = args.filter_column as string;
        const filterValue = args.filter_value as string;
        const limit = (args.limit as number) || 50;
        
        console.log(`🔍 جاري جلب البيانات من: ${tableName}`);
        
        let query = userSupabase.from(tableName).select(columns).limit(limit);
        
        if (filterColumn && filterValue) {
          query = query.eq(filterColumn, filterValue);
        }
        
        const { data, error } = await query;
        
        if (error) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
        
        return JSON.stringify({
          success: true,
          data,
          count: data?.length || 0,
        });
      }

      case "insert_data": {
        const tableName = args.table_name as string;
        const data = args.data as Record<string, unknown>;
        
        console.log(`➕ جاري إضافة بيانات للجدول: ${tableName}`);
        
        const { data: inserted, error } = await userSupabase
          .from(tableName)
          .insert(data)
          .select();
        
        if (error) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
        
        return JSON.stringify({
          success: true,
          inserted,
          message: "تم إضافة البيانات بنجاح"
        });
      }

      case "update_data": {
        const tableName = args.table_name as string;
        const filterColumn = args.filter_column as string;
        const filterValue = args.filter_value as string;
        const data = args.data as Record<string, unknown>;
        
        console.log(`✏️ جاري تعديل البيانات في: ${tableName}`);
        
        const { data: updated, error } = await userSupabase
          .from(tableName)
          .update(data)
          .eq(filterColumn, filterValue)
          .select();
        
        if (error) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
        
        return JSON.stringify({
          success: true,
          updated,
          count: updated?.length || 0,
          message: "تم التعديل بنجاح"
        });
      }

      case "delete_data": {
        const tableName = args.table_name as string;
        const filterColumn = args.filter_column as string;
        const filterValue = args.filter_value as string;
        
        console.log(`🗑️ جاري حذف البيانات من: ${tableName}`);
        
        const { data: deleted, error } = await userSupabase
          .from(tableName)
          .delete()
          .eq(filterColumn, filterValue)
          .select();
        
        if (error) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
        
        return JSON.stringify({
          success: true,
          deleted,
          count: deleted?.length || 0,
          message: "تم الحذف بنجاح"
        });
      }

      case "execute_sql": {
        const sql = args.sql as string;
        const description = args.description as string || "تنفيذ SQL";
        
        console.log(`⚡ جاري تنفيذ SQL: ${description}`);
        console.log(`SQL: ${sql}`);
        
        const sqlLower = sql.toLowerCase().trim();
        
        // Handle SELECT queries
        if (sqlLower.startsWith("select")) {
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
              });
            }
            
            return JSON.stringify({
              success: true,
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
            const valuesMatch = sql.match(/values\s*\(([^)]+)\)/i);
            const columnsMatch = sql.match(/\(([^)]+)\)\s*values/i);
            
            if (valuesMatch && columnsMatch) {
              const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/["'`]/g, ''));
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
                return JSON.stringify({ success: false, error: error.message });
              }
              
              return JSON.stringify({
                success: true,
                inserted: data,
              });
            }
          }
        }
        
        // Handle UPDATE queries
        if (sqlLower.startsWith("update")) {
          const tableMatch = sql.match(/update\s+["']?(\w+)["']?/i);
          const setMatch = sql.match(/set\s+(\w+)\s*=\s*['"]?([^'"]+)['"]?/i);
          const whereMatch = sql.match(/where\s+(\w+)\s*=\s*['"]?([^'";\s]+)['"]?/i);
          
          if (tableMatch && setMatch && whereMatch) {
            const tableName = tableMatch[1];
            const updateData: Record<string, unknown> = {};
            updateData[setMatch[1]] = setMatch[2];
            
            const { data, error } = await userSupabase
              .from(tableName)
              .update(updateData)
              .eq(whereMatch[1], whereMatch[2])
              .select();
            
            if (error) {
              return JSON.stringify({ success: false, error: error.message });
            }
            
            return JSON.stringify({
              success: true,
              updated: data,
              count: data?.length || 0,
            });
          }
        }
        
        // Handle DELETE queries
        if (sqlLower.startsWith("delete")) {
          const tableMatch = sql.match(/delete\s+from\s+["']?(\w+)["']?/i);
          const whereMatch = sql.match(/where\s+(\w+)\s*=\s*['"]?([^'";\s]+)['"]?/i);
          
          if (tableMatch && whereMatch) {
            const tableName = tableMatch[1];
            
            const { data, error } = await userSupabase
              .from(tableName)
              .delete()
              .eq(whereMatch[1], whereMatch[2])
              .select();
            
            if (error) {
              return JSON.stringify({ success: false, error: error.message });
            }
            
            return JSON.stringify({
              success: true,
              deleted: data,
              count: data?.length || 0,
            });
          }
        }
        
        // For DDL operations (CREATE, ALTER, DROP) - try RPC first
        if (sqlLower.startsWith("create") || sqlLower.startsWith("alter") || sqlLower.startsWith("drop")) {
          // Try exec_sql RPC function
          const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ query: sql }),
          });
          
          if (response.ok) {
            const result = await response.json();
            return JSON.stringify({
              success: true,
              result,
              message: "تم تنفيذ العملية بنجاح"
            });
          }
          
          // RPC doesn't exist, return instructions
          return JSON.stringify({
            success: false,
            requires_setup: true,
            message: "لتنفيذ عمليات DDL، محتاج تنشئ دالة exec_sql في قاعدة البيانات",
            setup_sql: `
-- نفذ الكود ده في SQL Editor في Supabase:
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE query;
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql(text) TO anon;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;
            `,
            requested_sql: sql,
          });
        }
        
        return JSON.stringify({
          success: false,
          error: "مش قادر أحلل الاستعلام ده",
          sql,
        });
      }

      default:
        return JSON.stringify({ error: `أداة مش موجودة: ${toolName}` });
    }
  } catch (error: any) {
    console.error(`❌ Tool error (${toolName}):`, error);
    return JSON.stringify({
      success: false,
      error: error.message,
      tool: toolName,
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory, supabaseUrl, supabaseKey } = await req.json();

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({
          error: "missing_credentials",
          response: "محتاج رابط Supabase والـ API Key عشان أقدر أساعدك 🔑",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!supabaseUrl.includes("supabase.co") && !supabaseUrl.includes("supabase.in")) {
      return new Response(
        JSON.stringify({
          error: "invalid_url",
          response: "الرابط ده مش صحيح! لازم يكون زي كده: https://xxxxx.supabase.co",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test connection
    try {
      const testClient = createClient(supabaseUrl, supabaseKey);
      await testClient.from('_test_').select('*').limit(1).maybeSingle();
    } catch (connError: any) {
      if (connError.message?.includes("Invalid API key")) {
        return new Response(
          JSON.stringify({
            error: "invalid_key",
            response: "الـ API Key ده مش صحيح 🔒 تأكد إنك استخدمت anon key أو service_role key",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const allMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(conversationHistory || []),
      ...messages,
    ];

    console.log("🤖 جاري الاتصال بالـ AI...");

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
      throw new Error(`مشكلة في الـ AI: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;

    // Handle tool calls loop
    let iterations = 0;
    const maxIterations = 15; // زودنا العدد عشان العمليات المعقدة

    while (assistantMessage.tool_calls && iterations < maxIterations) {
      iterations++;
      console.log(`🔧 Tool call #${iterations}`);

      const toolResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments || "{}");

        console.log(`⚡ Executing: ${toolName}`, toolArgs);

        const result = await executeToolCall(toolName, toolArgs, supabaseUrl, supabaseKey);

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

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
        console.error("AI error in loop:", errorText);
        throw new Error(`مشكلة في الـ AI: ${response.status}`);
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
    }

    const finalResponse = assistantMessage.content || "تمام! خلصت العملية 👍";

    return new Response(
      JSON.stringify({ response: finalResponse }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Error:", error);
    return new Response(
      JSON.stringify({
        error: "server_error",
        response: `أوبس! حصلت مشكلة 😅: ${error.message}`,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
