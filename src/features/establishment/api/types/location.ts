export interface Department {
    id: string
    code?: string
    name: string
}

export interface Municipality {
    id: string
    code?: string
    name: string
    department: Department
}