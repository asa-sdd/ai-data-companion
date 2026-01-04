import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

// System prompt for the AI
const SYSTEM_PROMPT = `أنت مساعد قاعدة بيانات ذكي يتحدث العربية. مهمتك هي:
1. فهم طلبات المستخدم باللغة العربية
2. تحويلها إلى استعلامات SQL مناسبة
3. تنفيذ الاستعلامات وعرض النتائج بشكل واضح

لديك الأدوات التالية:
- list_tables: لعرض جميع الجداول المتاحة
- describe_table: لوصف هيكل جدول معين
- execute_query: لتنفيذ استعلامات SELECT فقط (للقراءة)
- insert_data: لإضافة بيانات جديدة
- update_data: لتعديل بيانات موجودة
- delete_data: لحذف بيانات

قواعد مهمة:
- لا تنفذ أي استعلامات DROP أو TRUNCATE أو ALTER
- تأكد من صحة SQL قبل التنفيذ
- اشرح ما ستفعله قبل التنفيذ
- أظهر النتائج بشكل جدول منسق عند الإمكان
- إذا لم تفهم الطلب، اطلب توضيحاً

عند الرد، استخدم التنسيق التالي عند عرض نتائج:
- للجداول: استخدم markdown table
- للأخطاء: اشرح السبب وكيفية الإصلاح
- للتأكيد: اطلب تأكيد قبل عمليات الحذف أو التعديل`;

// Define tools for the AI
const tools = [
  {
    type: "function",
    function: {
      name: "list_tables",
      description: "عرض جميع الجداول المتاحة في قاعدة البيانات",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "describe_table",
      description: "وصف هيكل جدول معين وأعمدته",
      parameters: {
        type: "object",
        properties: {
          table_name: { type: "string", description: "اسم الجدول" }
        },
        required: ["table_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "execute_query",
      description: "تنفيذ استعلام SELECT لقراءة البيانات",
      parameters: {
        type: "object",
        properties: {
          table_name: { type: "string", description: "اسم الجدول" },
          columns: { type: "string", description: "الأعمدة المطلوبة (مفصولة بفاصلة) أو * للكل" },
          where_clause: { type: "string", description: "شرط البحث (اختياري)" },
          order_by: { type: "string", description: "ترتيب النتائج (اختياري)" },
          limit: { type: "number", description: "عدد النتائج المطلوبة (اختياري)" }
        },
        required: ["table_name"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "insert_data",
      description: "إضافة بيانات جديدة إلى جدول",
      parameters: {
        type: "object",
        properties: {
          table_name: { type: "string", description: "اسم الجدول" },
          data: { type: "object", description: "البيانات المراد إضافتها" }
        },
        required: ["table_name", "data"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_data",
      description: "تعديل بيانات موجودة في جدول",
      parameters: {
        type: "object",
        properties: {
          table_name: { type: "string", description: "اسم الجدول" },
          data: { type: "object", description: "البيانات المراد تعديلها" },
          where_clause: { type: "string", description: "شرط تحديد الصفوف للتعديل" }
        },
        required: ["table_name", "data", "where_clause"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_data",
      description: "حذف بيانات من جدول",
      parameters: {
        type: "object",
        properties: {
          table_name: { type: "string", description: "اسم الجدول" },
          where_clause: { type: "string", description: "شرط تحديد الصفوف للحذف" }
        },
        required: ["table_name", "where_clause"]
      }
    }
  }
];

// Execute tool calls
async function executeTool(supabase: any, toolName: string, args: any): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    case "list_tables": {
      // Try to get tables by querying a known system approach
      // Since we can't query information_schema directly, we'll try a different approach
      try {
        const { data, error } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public');
        
        if (!error && data) {
          return { success: true, tables: data.map((t: any) => t.tablename) };
        }
      } catch (e) {
        console.log('pg_tables approach failed, trying RPC');
      }

      // Try RPC approach
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_tables');
        if (!rpcError && rpcData) {
          return { success: true, tables: rpcData };
        }
      } catch (e) {
        console.log('RPC approach failed');
      }

      return { 
        success: false, 
        error: "لا يمكن الوصول إلى قائمة الجداول. تأكد من صحة بيانات الاتصال وأن لديك صلاحيات كافية.",
        hint: "جرب أن تسألني عن جدول محدد إذا كنت تعرف اسمه"
      };
    }

    case "describe_table": {
      const tableName = args.table_name;
      
      // Try to get a sample to understand the structure
      const { data: sample, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        return { success: false, error: `الجدول "${tableName}" غير موجود أو لا يمكن الوصول إليه: ${error.message}` };
      }
      
      const columns = sample && sample.length > 0 
        ? Object.entries(sample[0]).map(([name, value]) => ({ 
            name, 
            type: value === null ? 'unknown' : typeof value,
            sample: value
          }))
        : [];
      
      // If no data, try to get just the structure
      if (columns.length === 0) {
        const { error: structError } = await supabase.from(tableName).select('*').limit(0);
        if (structError) {
          return { success: false, error: `الجدول "${tableName}" غير موجود` };
        }
        return { 
          success: true, 
          table_name: tableName,
          columns: [],
          message: "الجدول موجود لكنه فارغ"
        };
      }
      
      return { 
        success: true, 
        table_name: tableName,
        columns
      };
    }

    case "execute_query": {
      let query = supabase.from(args.table_name).select(args.columns || '*');
      
      if (args.order_by) {
        const [column, direction] = args.order_by.split(' ');
        query = query.order(column, { ascending: direction?.toLowerCase() !== 'desc' });
      }
      
      if (args.limit) {
        query = query.limit(args.limit);
      }

      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, data, count: data?.length || 0 };
    }

    case "insert_data": {
      const { data, error } = await supabase
        .from(args.table_name)
        .insert(args.data)
        .select();
      
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: "تمت الإضافة بنجاح", data };
    }

    case "update_data": {
      // Parse where clause - support id-based updates
      const match = args.where_clause.match(/id\s*=\s*['"]?([^'"]+)['"]?/i);
      if (!match) {
        return { success: false, error: "يجب تحديد id للتعديل. مثال: id = 1" };
      }
      
      const { data, error } = await supabase
        .from(args.table_name)
        .update(args.data)
        .eq('id', match[1])
        .select();
      
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: "تم التعديل بنجاح", data };
    }

    case "delete_data": {
      // Parse where clause - support id-based deletes
      const match = args.where_clause.match(/id\s*=\s*['"]?([^'"]+)['"]?/i);
      if (!match) {
        return { success: false, error: "يجب تحديد id للحذف. مثال: id = 1" };
      }
      
      const { data, error } = await supabase
        .from(args.table_name)
        .delete()
        .eq('id', match[1])
        .select();
      
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true, message: "تم الحذف بنجاح", deleted: data };
    }

    default:
      return { success: false, error: `أداة غير معروفة: ${toolName}` };
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationHistory = [], supabaseUrl, supabaseKey } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Validate user-provided Supabase credentials
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ 
        error: 'missing_credentials',
        response: 'يرجى توفير بيانات اتصال Supabase (URL و Anon Key) أولاً'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL format
    if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.in')) {
      return new Response(JSON.stringify({ 
        error: 'invalid_url',
        response: 'عنوان Supabase غير صالح. يجب أن يكون بالشكل: https://xxxxx.supabase.co'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating Supabase client for user database:', supabaseUrl);

    // Create Supabase client with user's credentials
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Test connection by trying a simple query
    const { error: testError } = await supabase.from('_test_connection_').select('*').limit(1);
    // We expect this to fail (table doesn't exist), but if it's an auth error, that's different
    if (testError && testError.message.includes('Invalid API key')) {
      return new Response(JSON.stringify({ 
        error: 'invalid_key',
        response: 'مفتاح API غير صالح. تأكد من استخدام Anon Key الصحيح.'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build conversation
    const allMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory,
      ...messages
    ];

    console.log('Sending request to AI with messages:', allMessages.length);

    // First AI call
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: allMessages,
        tools: tools,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'rate_limit',
          response: 'تم تجاوز حد الطلبات. يرجى المحاولة بعد قليل.'
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices[0].message;

    // Handle tool calls
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('Processing tool calls:', assistantMessage.tool_calls.length);
      
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        const result = await executeTool(supabase, toolName, toolArgs);
        
        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }

      // Continue conversation with tool results
      const updatedMessages = [
        ...allMessages,
        assistantMessage,
        ...toolResults
      ];

      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: updatedMessages,
          tools: tools,
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API error on tool response:', errorText);
        throw new Error(`AI API error: ${response.status}`);
      }

      data = await response.json();
      assistantMessage = data.choices[0].message;
    }

    const finalContent = assistantMessage.content || 'عذراً، لم أتمكن من معالجة طلبك.';

    return new Response(JSON.stringify({ 
      response: finalContent,
      toolsUsed: assistantMessage.tool_calls ? true : false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
    console.error('Error in ai-database function:', error);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      response: `عذراً، حدث خطأ: ${errorMessage}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
