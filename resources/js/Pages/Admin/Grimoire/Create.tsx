import React, { FormEventHandler, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';

interface Category {
    id: number;
    name: string;
    slug: string;
}

interface Props {
    auth: {
        user: {
            id: number;
            name: string;
            email: string;
        };
    };
    categories: Category[];
}

export default function CreateGrimoire({ auth, categories }: Props) {
    const { data, setData, post, processing, errors, progress } = useForm({
        category_id: '',
        slug: '',
        title: '',
        summary: '',
        content_html: '',
        tags: [] as string[],
        pdf_file: null as File | null,
        role_access: 'all',
        difficulty: '',
        is_published: false,
    });

    const [tagInput, setTagInput] = useState('');
    const [previewFile, setPreviewFile] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setData('pdf_file', file);
            setPreviewFile(file.name);
        }
    };

    const handleAddTag = () => {
        if (tagInput.trim() && !data.tags.includes(tagInput.trim())) {
            setData('tags', [...data.tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setData('tags', data.tags.filter(tag => tag !== tagToRemove));
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('admin.grimoire.store'));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Tambah Pedoman Grimoire
                </h2>
            }
        >
            <Head title="Tambah Pedoman" />

            <div className="py-12">
                <div className="max-w-4xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            <form onSubmit={submit} className="space-y-6">
                                {/* Category */}
                                <div>
                                    <InputLabel htmlFor="category_id" value="Kategori *" />
                                    <select
                                        id="category_id"
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.category_id}
                                        onChange={(e) => setData('category_id', e.target.value)}
                                        required
                                    >
                                        <option value="">Pilih Kategori</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError message={errors.category_id} className="mt-2" />
                                </div>

                                {/* Title */}
                                <div>
                                    <InputLabel htmlFor="title" value="Judul *" />
                                    <TextInput
                                        id="title"
                                        type="text"
                                        className="mt-1 block w-full"
                                        value={data.title}
                                        onChange={(e) => {
                                            setData('title', e.target.value);
                                            // Auto-generate slug
                                            const slug = e.target.value
                                                .toLowerCase()
                                                .replace(/[^a-z0-9]+/g, '-')
                                                .replace(/(^-|-$)/g, '');
                                            setData('slug', slug);
                                        }}
                                        required
                                    />
                                    <InputError message={errors.title} className="mt-2" />
                                </div>

                                {/* Slug */}
                                <div>
                                    <InputLabel htmlFor="slug" value="Slug *" />
                                    <TextInput
                                        id="slug"
                                        type="text"
                                        className="mt-1 block w-full"
                                        value={data.slug}
                                        onChange={(e) => setData('slug', e.target.value)}
                                        required
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        URL-friendly identifier (auto-generated dari judul)
                                    </p>
                                    <InputError message={errors.slug} className="mt-2" />
                                </div>

                                {/* Summary */}
                                <div>
                                    <InputLabel htmlFor="summary" value="Ringkasan" />
                                    <textarea
                                        id="summary"
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        rows={3}
                                        value={data.summary}
                                        onChange={(e) => setData('summary', e.target.value)}
                                    />
                                    <InputError message={errors.summary} className="mt-2" />
                                </div>

                                {/* Content HTML */}
                                <div>
                                    <InputLabel htmlFor="content_html" value="Konten HTML" />
                                    <textarea
                                        id="content_html"
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-sm"
                                        rows={8}
                                        value={data.content_html}
                                        onChange={(e) => setData('content_html', e.target.value)}
                                    />
                                    <p className="mt-1 text-sm text-gray-500">
                                        Opsional: Konten HTML untuk ditampilkan di web
                                    </p>
                                    <InputError message={errors.content_html} className="mt-2" />
                                </div>

                                {/* File PDF Upload */}
                                <div>
                                    <InputLabel htmlFor="pdf_file" value="Upload PDF" />
                                    <div className="mt-1">
                                        <input
                                            id="pdf_file"
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            onChange={handleFileChange}
                                            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                                        />
                                    </div>

                                    {previewFile && (
                                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                            <p className="text-sm text-blue-800">
                                                📄 File dipilih: <strong>{previewFile}</strong>
                                            </p>
                                        </div>
                                    )}

                                    {progress && (
                                        <div className="mt-2">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div
                                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress.percentage}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-sm text-gray-600 mt-1">
                                                Upload progress: {progress.percentage}%
                                            </p>
                                        </div>
                                    )}

                                    <p className="mt-1 text-sm text-gray-500">
                                        Max size: 10MB. Format: PDF
                                    </p>
                                    <InputError message={errors.pdf_file} className="mt-2" />
                                </div>

                                {/* Tags */}
                                <div>
                                    <InputLabel htmlFor="tags" value="Tags" />
                                    <div className="flex gap-2 mt-1">
                                        <TextInput
                                            id="tag-input"
                                            type="text"
                                            className="flex-1"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAddTag();
                                                }
                                            }}
                                            placeholder="Ketik tag dan tekan Enter"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddTag}
                                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm font-medium"
                                        >
                                            Tambah
                                        </button>
                                    </div>

                                    {data.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {data.tags.map((tag, index) => (
                                                <span
                                                    key={index}
                                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                                                >
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveTag(tag)}
                                                        className="ml-2 text-indigo-600 hover:text-indigo-800"
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <InputError message={errors.tags} className="mt-2" />
                                </div>

                                {/* Role Access */}
                                <div>
                                    <InputLabel htmlFor="role_access" value="Akses Role *" />
                                    <select
                                        id="role_access"
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.role_access}
                                        onChange={(e) => setData('role_access', e.target.value)}
                                        required
                                    >
                                        <option value="all">Semua</option>
                                        <option value="defuser">Defuser</option>
                                        <option value="expert">Expert</option>
                                    </select>
                                    <InputError message={errors.role_access} className="mt-2" />
                                </div>

                                {/* Difficulty */}
                                <div>
                                    <InputLabel htmlFor="difficulty" value="Tingkat Kesulitan" />
                                    <select
                                        id="difficulty"
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                        value={data.difficulty}
                                        onChange={(e) => setData('difficulty', e.target.value)}
                                    >
                                        <option value="">Tidak ditentukan</option>
                                        <option value="beginner">Beginner</option>
                                        <option value="intermediate">Intermediate</option>
                                        <option value="advanced">Advanced</option>
                                        <option value="expert">Expert</option>
                                    </select>
                                    <InputError message={errors.difficulty} className="mt-2" />
                                </div>

                                {/* Is Published */}
                                <div className="flex items-center">
                                    <input
                                        id="is_published"
                                        type="checkbox"
                                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                                        checked={data.is_published}
                                        onChange={(e) => setData('is_published', e.target.checked)}
                                    />
                                    <label htmlFor="is_published" className="ml-2 text-sm text-gray-700">
                                        Publikasikan segera
                                    </label>
                                </div>

                                {/* Submit Button */}
                                <div className="flex items-center justify-end gap-4">
                                    <a
                                        href={route('admin.grimoire.index')}
                                        className="text-sm text-gray-600 hover:text-gray-900"
                                    >
                                        Batal
                                    </a>
                                    <PrimaryButton disabled={processing}>
                                        {processing ? 'Menyimpan...' : 'Simpan Pedoman'}
                                    </PrimaryButton>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
