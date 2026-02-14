import { Router } from "express"
import prisma from "../prisma"

const router = Router()

router.get("/list", async (req, res) => {
    // Definisi tipe untuk Route
    type RouteInfo = { method: string; path: string }

    // Daftar route yang tersedia
    const routes: RouteInfo[] = [
        { method: "GET", path: "/api/categories" },
        { method: "POST", path: "/api/categories" },
        { method: "PUT", path: "/api/categories/:id" },
        { method: "DELETE", path: "/api/categories/:id" },
        
        { method: "GET", path: "/api/products" },
        { method: "POST", path: "/api/products" },
        { method: "GET", path: "/api/products/:id" },
        { method: "PUT", path: "/api/products/:id" },
        { method: "DELETE", path: "/api/products/:id" },
        
        { method: "GET", path: "/api/transactions" },
        { method: "POST", path: "/api/transactions" },
        { method: "GET", path: "/api/transactions/product/:productId" },
        
        { method: "GET", path: "/api/test/list" },
    ]

    // Definisi tipe untuk Struktur Tabel
    type FieldInfo = { name: string; type: string; isId: boolean; isRequired: boolean; isList: boolean }
    type TableInfo = { name: string; fields: FieldInfo[] }

    // Ambil struktur tabel dari metadata Prisma
    let tables: TableInfo[] = []
    try {
        // @ts-ignore: Mengakses properti internal Prisma untuk mendapatkan metadata
        const runtimeDataModel = prisma._runtimeDataModel
        if (runtimeDataModel && runtimeDataModel.models) {
            // @ts-ignore
            tables = Object.keys(runtimeDataModel.models).map(key => {
                const model = runtimeDataModel.models[key]
                return {
                    name: key,
                    fields: model.fields.map((f: any) => ({
                        name: f.name,
                        type: f.type,
                        isId: f.isId,
                        isRequired: f.isRequired,
                        isList: f.isList
                    }))
                }
            })
        } else {
            // Fallback jika metadata tidak tersedia
            tables = [
                { name: "Category", fields: [] }, 
                { name: "Product", fields: [] }, 
                { name: "Transaction", fields: [] }, 
                { name: "User", fields: [] }
            ]
        }
    } catch (error) {
        console.error("Error fetching prisma model:", error)
        tables = []
    }

    // Grouping routes berdasarkan prefix
    const groupedRoutes: Record<string, RouteInfo[]> = {}
    routes.forEach(route => {
        const parts = route.path.split('/')
        const group = parts[2] || 'root'
        if (!groupedRoutes[group]) {
            groupedRoutes[group] = []
        }
        groupedRoutes[group]?.push(route)
    })

    const groups = Object.keys(groupedRoutes).sort()

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>System Status & Documentation</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --primary: #4f46e5;
                --bg: #f3f4f6;
                --card-bg: #ffffff;
                --text: #1f2937;
                --text-secondary: #6b7280;
                --border: #e5e7eb;
                --success: #10b981;
                --warning: #f59e0b;
                --danger: #ef4444;
                --info: #3b82f6;
            }
            body { font-family: 'Inter', sans-serif; padding: 40px; background-color: var(--bg); color: var(--text); max-width: 1400px; margin: 0 auto; line-height: 1.5; }
            h1 { color: var(--text); margin-bottom: 0.5rem; font-weight: 800; letter-spacing: -0.025em; }
            .header { margin-bottom: 3rem; border-bottom: 1px solid var(--border); padding-bottom: 1.5rem; }
            .timestamp { color: var(--text-secondary); font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
            .timestamp::before { content: ''; display: block; width: 8px; height: 8px; background-color: var(--success); border-radius: 50%; }
            
            .section-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem; color: var(--text); display: flex; align-items: center; gap: 0.5rem; margin-top: 2rem; }
            
            /* Grid Layout */
            .grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); 
                gap: 1.5rem; 
                margin-bottom: 3rem; 
            }
            
            .card { 
                background: var(--card-bg); 
                border-radius: 12px; 
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); 
                border: 1px solid var(--border); 
                overflow: hidden; 
                transition: all 0.2s ease; 
            }
            .card:hover { 
                transform: translateY(-4px); 
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); 
                border-color: #d1d5db;
            }
            
            .card-header { 
                padding: 1rem 1.5rem; 
                border-bottom: 1px solid var(--border); 
                background-color: #f9fafb; 
                font-weight: 600; 
                text-transform: capitalize; 
                color: var(--text); 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
            }
            .card-body { padding: 0; }
            
            /* Routes Styling */
            .route-list { list-style: none; padding: 0; margin: 0; }
            .route-item { padding: 0.75rem 1.5rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 1rem; font-size: 0.875rem; }
            .route-item:last-child { border-bottom: none; }
            .route-item:hover { background-color: #f9fafb; }
            
            .method { font-weight: 700; font-size: 0.7rem; padding: 0.25rem 0.5rem; border-radius: 4px; min-width: 50px; text-align: center; letter-spacing: 0.05em; }
            .GET { background-color: #eff6ff; color: var(--info); border: 1px solid #bfdbfe; }
            .POST { background-color: #ecfdf5; color: var(--success); border: 1px solid #a7f3d0; }
            .PUT { background-color: #fffbeb; color: var(--warning); border: 1px solid #fde68a; }
            .DELETE { background-color: #fef2f2; color: var(--danger); border: 1px solid #fecaca; }
            
            .path { font-family: 'Consolas', 'Monaco', monospace; color: var(--text); word-break: break-all; font-size: 0.85em; }

            /* Table Styling */
            .schema-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
            .schema-table th { text-align: left; padding: 0.75rem 1.5rem; background-color: #f9fafb; color: var(--text-secondary); font-weight: 600; border-bottom: 1px solid var(--border); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
            .schema-table td { padding: 0.6rem 1.5rem; border-bottom: 1px solid var(--border); color: var(--text); }
            .schema-table tr:last-child td { border-bottom: none; }
            .schema-table tr:hover td { background-color: #fcfcfc; }
            
            .type-badge { background-color: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 4px; color: var(--text-secondary); font-size: 0.75rem; font-family: monospace; border: 1px solid #e5e7eb; }
            .pk-badge { background-color: #fff7ed; color: #b45309; padding: 0.125rem 0.375rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700; margin-left: 0.5rem; border: 1px solid #ffedd5; }
            .req-badge { color: var(--danger); margin-left: 2px; font-weight: bold; }
            
            .empty-state { padding: 2rem; text-align: center; color: var(--text-secondary); font-style: italic; font-size: 0.875rem; }
            
            .badge-count { background: #e5e7eb; padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; color: var(--text-secondary); }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>System Status & Documentation</h1>
            <div class="timestamp">Server is running • Last Checked: ${new Date().toLocaleString()}</div>
        </div>

        <div class="section-title">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"></path></svg>
            Database Schema
        </div>
        <div class="grid">
            ${tables.length > 0 ? tables.map(table => `
                <div class="card">
                    <div class="card-header">
                        ${table.name}
                        <span class="badge-count">${table.fields.length} fields</span>
                    </div>
                    <div class="card-body">
                        <table class="schema-table">
                            <thead>
                                <tr>
                                    <th>Field Name</th>
                                    <th>Data Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${table.fields.map(f => `
                                    <tr>
                                        <td>
                                            <span style="font-weight: 500;">${f.name}</span>
                                            ${f.isId ? '<span class="pk-badge">PK</span>' : ''}
                                            ${f.isRequired && !f.isId ? '<span class="req-badge" title="Required">*</span>' : ''}
                                        </td>
                                        <td>
                                            <span class="type-badge">${f.type}${f.isList ? '[]' : ''}</span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        ${table.fields.length === 0 ? '<div class="empty-state">No fields definition found</div>' : ''}
                    </div>
                </div>
            `).join('') : '<div class="empty-state">No tables found or Prisma not initialized</div>'}
        </div>

        <div class="section-title">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
            Available Routes
        </div>
        <div class="grid">
            ${groups.map(group => `
                <div class="card">
                    <div class="card-header">
                        ${group}
                        <span class="badge-count">${groupedRoutes[group]?.length} endpoints</span>
                    </div>
                    <div class="card-body">
                        <ul class="route-list">
                            ${groupedRoutes[group]?.map(r => `
                                <li class="route-item">
                                    <span class="method ${r.method}">${r.method}</span>
                                    <span class="path">${r.path}</span>
                                </li>
                            `).join('') || ''}
                        </ul>
                    </div>
                </div>
            `).join('')}
        </div>
    </body>
    </html>
    `

    res.send(html)
})

export default router
