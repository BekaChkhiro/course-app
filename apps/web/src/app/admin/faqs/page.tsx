'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, HelpCircle } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminLayout from '@/components/admin/AdminLayout';
import Modal, { ModalFooter } from '@/components/ui/Modal';
import { faqApi } from '@/lib/api/adminApi';
import toast from 'react-hot-toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';

type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Sortable FAQ Item Component
function SortableFAQItem({
  faq,
  onEdit,
  onDelete,
  onToggle,
}: {
  faq: FAQ;
  onEdit: (faq: FAQ) => void;
  onDelete: (faq: FAQ) => void;
  onToggle: (faq: FAQ) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: faq.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? 'opacity-50' : ''}`}
    >
      <div className={`flex items-start gap-3 p-4 bg-white border rounded-lg mb-2 hover:shadow-sm transition-shadow ${!faq.isActive ? 'opacity-60' : ''}`}>
        {/* Drag Handle */}
        <button
          {...attributes}
          {...listeners}
          className="p-1 hover:bg-gray-100 rounded cursor-grab active:cursor-grabbing mt-1"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </button>

        {/* Icon */}
        <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-5 h-5 text-accent-600" />
        </div>

        {/* FAQ Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-gray-900 line-clamp-1">{faq.question}</h3>
            {faq.category && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                {faq.category}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 line-clamp-2">{faq.answer}</p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            faq.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {faq.isActive ? 'აქტიური' : 'არააქტიური'}
          </span>
          <span className="text-xs text-gray-400">#{faq.order}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(faq)}
            className={`p-2 hover:bg-gray-100 rounded ${faq.isActive ? 'text-green-600' : 'text-gray-400'}`}
            title={faq.isActive ? 'გამორთვა' : 'ჩართვა'}
          >
            {faq.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onEdit(faq)}
            className="p-2 hover:bg-gray-100 rounded text-gray-600"
            title="რედაქტირება"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(faq)}
            className="p-2 hover:bg-red-50 rounded text-red-600"
            title="წაშლა"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FAQsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [localFAQs, setLocalFAQs] = useState<FAQ[]>([]);

  const queryClient = useQueryClient();

  const { data: faqsData, isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: () => faqApi.getAll().then(res => res.data)
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (faqsData?.faqs) {
      setLocalFAQs(faqsData.faqs);
    }
  }, [faqsData]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => faqApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ წარმატებით წაიშალა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'FAQ-ის წაშლა ვერ მოხერხდა');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => faqApi.toggle(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      const faq = response.data.faq;
      toast.success(faq.isActive ? 'FAQ გააქტიურდა' : 'FAQ გაუქმდა');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'სტატუსის შეცვლა ვერ მოხერხდა');
    }
  });

  const reorderMutation = useMutation({
    mutationFn: (faqs: { id: string; order: number }[]) => faqApi.reorder(faqs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('თანმიმდევრობა შენახულია');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'თანმიმდევრობის შენახვა ვერ მოხერხდა');
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const sortedFAQs = [...localFAQs].sort((a, b) => a.order - b.order);

  const handleDelete = (faq: FAQ) => {
    if (confirm(`დარწმუნებული ხართ რომ გსურთ წაშლა?`)) {
      deleteMutation.mutate(faq.id);
    }
  };

  const handleEdit = (faq: FAQ) => {
    setSelectedFAQ(faq);
    setIsModalOpen(true);
  };

  const handleToggle = (faq: FAQ) => {
    toggleMutation.mutate(faq.id);
  };

  const handleCreate = () => {
    setSelectedFAQ(null);
    setIsModalOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedFAQs.findIndex(item => item.id === active.id);
      const newIndex = sortedFAQs.findIndex(item => item.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newItems = arrayMove(sortedFAQs, oldIndex, newIndex);

        // Update local state
        const updatedFAQs = newItems.map((item, index) => ({
          ...item,
          order: index
        }));
        setLocalFAQs(updatedFAQs);

        // Save to server
        const reorderData = newItems.map((item, index) => ({
          id: item.id,
          order: index
        }));
        reorderMutation.mutate(reorderData);
      }
    }
  };

  // Stats
  const totalFAQs = localFAQs.length;
  const activeFAQs = localFAQs.filter(f => f.isActive).length;
  const categories = [...new Set(localFAQs.map(f => f.category).filter(Boolean))];

  if (isLoading) return <PageLoader />;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ხშირად დასმული კითხვები</h1>
            <p className="mt-1 text-sm text-gray-500">
              მართეთ FAQ-ები რომლებიც გამოჩნდება მთავარ გვერდზე
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
          >
            <Plus className="w-4 h-4" />
            ახალი FAQ
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-gray-900">{totalFAQs}</div>
            <div className="text-sm text-gray-500">სულ FAQ</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-green-600">{activeFAQs}</div>
            <div className="text-sm text-gray-500">აქტიური</div>
          </div>
          <div className="bg-white p-4 rounded-lg border">
            <div className="text-2xl font-bold text-accent-600">{categories.length}</div>
            <div className="text-sm text-gray-500">კატეგორია</div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 text-sm text-accent-700">
          <strong>მინიშნება:</strong> გადაათრიეთ FAQ-ები თანმიმდევრობის შესაცვლელად.
          მხოლოდ აქტიური FAQ-ები გამოჩნდება მთავარ გვერდზე.
        </div>

        {/* FAQ List */}
        <div className="bg-gray-50 rounded-xl p-4">
          {sortedFAQs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>FAQ-ები არ მოიძებნა</p>
              <button
                onClick={handleCreate}
                className="mt-4 text-accent-600 hover:text-accent-700 font-medium"
              >
                დაამატეთ პირველი FAQ
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedFAQs.map(f => f.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedFAQs.map(faq => (
                  <SortableFAQItem
                    key={faq.id}
                    faq={faq}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggle={handleToggle}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <FAQModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedFAQ(null);
        }}
        faq={selectedFAQ}
        existingCategories={categories as string[]}
      />
    </AdminLayout>
  );
}

function FAQModal({
  isOpen,
  onClose,
  faq,
  existingCategories
}: {
  isOpen: boolean;
  onClose: () => void;
  faq: FAQ | null;
  existingCategories: string[];
}) {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    isActive: true
  });

  // Update form data when modal opens or faq changes
  useEffect(() => {
    if (isOpen) {
      if (faq) {
        setFormData({
          question: faq.question || '',
          answer: faq.answer || '',
          category: faq.category || '',
          isActive: faq.isActive ?? true
        });
      } else {
        // Reset form for new FAQ
        setFormData({
          question: '',
          answer: '',
          category: '',
          isActive: true
        });
      }
    }
  }, [isOpen, faq]);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => faqApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ წარმატებით შეიქმნა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'FAQ-ის შექმნა ვერ მოხერხდა');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => faqApi.update(faq!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['faqs'] });
      toast.success('FAQ წარმატებით განახლდა');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'FAQ-ის განახლება ვერ მოხერხდა');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.question.trim() || !formData.answer.trim()) {
      toast.error('კითხვა და პასუხი სავალდებულოა');
      return;
    }

    const data = {
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      category: formData.category.trim() || null,
      isActive: formData.isActive
    };

    if (faq) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={faq ? 'FAQ-ის რედაქტირება' : 'ახალი FAQ'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            კითხვა <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
            placeholder="მაგ: როგორ შევიძინო კურსი?"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            პასუხი <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.answer}
            onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
            rows={5}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
            placeholder="შეიყვანეთ დეტალური პასუხი..."
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">კატეგორია</label>
          <input
            type="text"
            list="category-options"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent-600 focus:border-transparent"
            placeholder="მაგ: გადახდა, კურსები, ტექნიკური"
          />
          <datalist id="category-options">
            {existingCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-gray-500">
            არასავალდებულო. შეგიძლიათ აირჩიოთ არსებული ან შექმნათ ახალი.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="isActive"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="w-4 h-4 text-accent-600 border-gray-300 rounded focus:ring-accent-600"
          />
          <label htmlFor="isActive" className="text-sm text-gray-700">
            აქტიური (გამოჩნდება მთავარ გვერდზე)
          </label>
        </div>

        <ModalFooter>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            გაუქმება
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending
              ? 'ინახება...'
              : faq
              ? 'განახლება'
              : 'შექმნა'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
