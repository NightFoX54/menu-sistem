package com.kafe.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@jakarta.persistence.Table(
        name = "feedback_items",
        uniqueConstraints = @UniqueConstraint(columnNames = {"feedback_id", "menu_item_id"})
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "feedback_id", nullable = false)
    private Feedback feedback;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "menu_item_id", nullable = false)
    private MenuItem menuItem;

    @Column(nullable = false)
    private boolean liked;
}
